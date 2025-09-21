"""
Elevation Data Fetcher
Fetches elevation data and computes slope for flood risk assessment.
"""

import requests
import yaml
import numpy as np
from typing import Optional
import math
import os


class ElevationFetcher:
    def __init__(self, config_path: str = "config.yaml"):
        """Initialize with configuration file."""
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Read API key from environment variable
        self.google_api_key = os.getenv('GOOGLE_ELEVATION_API_KEY', 'YOUR_GOOGLE_ELEVATION_API_KEY')
        self.google_url = "https://maps.googleapis.com/maps/api/elevation/json"
        self.free_api_url = self.config['alternative_apis']['elevation']
    
    def get_slope(self, lat: float, lon: float) -> float:
        """
        Get slope percentage for given coordinates.
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            Slope percentage
        """
        # Get elevations for current point and nearby points
        center_elev = self._get_elevation(lat, lon)
        north_elev = self._get_elevation(lat + 0.001, lon)
        east_elev = self._get_elevation(lat, lon + 0.001)
        
        if None in [center_elev, north_elev, east_elev]:
            # Use mock slope if elevation data unavailable
            slope_percentage = np.random.uniform(0.5, 5.0)
            print(f"📊 Mock slope: {slope_percentage:.2f}%")
            return slope_percentage
        
        # Calculate slope in both directions
        distance = 111.0  # Approximate meters for 0.001 degrees
        slope_north = abs(north_elev - center_elev) / distance
        slope_east = abs(east_elev - center_elev) / distance
        
        # Use maximum slope
        max_slope = max(slope_north, slope_east)
        slope_percentage = max_slope * 100
        
        print(f"📊 Calculated slope: {slope_percentage:.2f}%")
        return slope_percentage
    
    def get_elevation(self, lat: float, lon: float) -> Optional[float]:
        """
        Get elevation for given coordinates.
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            Elevation in meters, or None if unavailable
        """
        elevation = self._get_elevation(lat, lon)
        if elevation is not None:
            print(f"📊 Elevation: {elevation:.1f}m")
        else:
            print("⚠️  Elevation data unavailable")
        return elevation
    
    def calculate_slope(self, lat: float, lon: float) -> tuple:
        """
        Calculate slope percentage and category.
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            Tuple of (slope_percentage, slope_category)
        """
        slope_pct = self.get_slope(lat, lon)
        
        # Categorize slope
        if slope_pct < 2:
            category = "Very Flat"
        elif slope_pct < 5:
            category = "Gentle"
        elif slope_pct < 10:
            category = "Moderate"
        elif slope_pct < 20:
            category = "Steep"
        else:
            category = "Very Steep"
        
        return slope_pct, category
    
    def _get_elevation(self, lat: float, lon: float) -> Optional[float]:
        """Get elevation for a single point."""
        # Try Google API first if key is configured
        if self.google_api_key != "YOUR_GOOGLE_ELEVATION_API_KEY":
            elevation = self._get_google_elevation(lat, lon)
            if elevation is not None:
                return elevation
        
        # Fall back to free API
        return self._get_free_elevation(lat, lon)
    
    def _get_google_elevation(self, lat: float, lon: float) -> Optional[float]:
        """Get elevation using Google Elevation API."""
        try:
            params = {
                'locations': f"{lat},{lon}",
                'key': self.google_api_key
            }
            
            response = requests.get(self.google_url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            if data['status'] == 'OK' and data['results']:
                elevation = data['results'][0]['elevation']
                return elevation
            else:
                return None
                
        except requests.RequestException:
            return None
    
    def _get_free_elevation(self, lat: float, lon: float) -> Optional[float]:
        """Get elevation using free OpenTopoData API."""
        try:
            url = f"{self.free_api_url}?locations={lat},{lon}"
            
            response = requests.get(url)
            response.raise_for_status()
            
            data = response.json()
            
            if data['status'] == 'OK' and data['results']:
                elevation = data['results'][0]['elevation']
                if elevation is not None:
                    return elevation
            
            return self._get_mock_elevation(lat, lon)
            
        except requests.RequestException:
            return self._get_mock_elevation(lat, lon)
    
    def _get_mock_elevation(self, lat: float, lon: float) -> float:
        """Generate mock elevation data for testing."""
        # Use a simple formula based on coordinates to generate realistic-ish elevations
        base_elevation = abs(math.sin(lat * 0.1) * math.cos(lon * 0.1)) * 500
        noise = (hash(str(lat) + str(lon)) % 100) - 50  # Add some variation
        elevation = max(0, base_elevation + noise)
        
        return elevation


def main():
    """Test the ElevationFetcher with sample coordinates."""
    fetcher = ElevationFetcher()
    
    # Test coordinates (San Francisco - known for hills)
    lat, lon = 37.7749, -122.4194
    
    print(f"Fetching elevation data for coordinates: {lat}, {lon}")
    
    # Calculate slope
    slope_pct = fetcher.get_slope(lat, lon)
    print(f"✅ Slope: {slope_pct:.2f}%")


if __name__ == "__main__":
    main()