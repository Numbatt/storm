"""
Google Street View Image Fetcher
Downloads Street View images for flood risk analysis.
"""

import os
import requests
import yaml
from typing import List, Tuple
from dotenv import load_dotenv

load_dotenv()


class StreetViewFetcher:
    """Fetches Google Street View images for given coordinates."""
    
    def __init__(self, config_path: str = "config.yaml"):
        """Initialize with configuration."""
        self.config_path = config_path
        self.config = self._load_config()
        self.api_key = os.getenv('GOOGLE_STREET_VIEW_API_KEY')
        
        if not self.api_key:
            raise ValueError("GOOGLE_STREET_VIEW_API_KEY environment variable is required")
    
    def _load_config(self) -> dict:
        """Load configuration from YAML file."""
        try:
            with open(self.config_path, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            print(f"⚠️ Warning: Config file {self.config_path} not found")
            return {}
    
    def fetch_images(self, lat: float, lon: float, output_dir: str = "data/processed") -> List[str]:
        """
        Fetch Street View images for four cardinal directions.
        
        Args:
            lat: Latitude coordinate
            lon: Longitude coordinate
            output_dir: Directory to save images
            
        Returns:
            List of saved image file paths
        """
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Get image settings from config
        image_settings = self.config.get('image_settings', {})
        size = image_settings.get('street_view_size', '640x640')
        fov = image_settings.get('street_view_fov', 90)
        pitch = image_settings.get('street_view_pitch', 0)
        
        # Define four cardinal directions
        headings = [0, 90, 180, 270]
        saved_images = []
        
        print(f"📸 Fetching Street View images for {lat}, {lon}...")
        
        for heading in headings:
            filename = f"{lat}_{lon}_{heading}.jpg"
            filepath = os.path.join(output_dir, filename)
            
            # Skip if image already exists
            if os.path.exists(filepath):
                print(f"   ✓ Image exists: {filename}")
                saved_images.append(filepath)
                continue
            
            try:
                print(f"   📥 Downloading {filename} (heading: {heading}°)...")
                
                # Build Street View API URL
                url = "https://maps.googleapis.com/maps/api/streetview"
                params = {
                    'size': size,
                    'location': f"{lat},{lon}",
                    'heading': heading,
                    'fov': fov,
                    'pitch': pitch,
                    'key': self.api_key
                }
                
                # Download image
                response = requests.get(url, params=params, timeout=30)
                response.raise_for_status()
                
                # Check if we got a valid image (not an error image)
                if len(response.content) < 1000:  # Very small images are usually errors
                    print(f"   ⚠️ Warning: Received very small image for {filename}")
                
                # Save image
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                
                saved_images.append(filepath)
                print(f"   Saved: {filename}")
                
            except requests.RequestException as e:
                print(f"   Failed to download {filename}: {e}")
                continue
            except Exception as e:
                print(f"   Error processing {filename}: {e}")
                continue
        
        if not saved_images:
            raise RuntimeError(f"Failed to fetch any Street View images for {lat}, {lon}")
        
        print(f"Successfully fetched {len(saved_images)}/4 Street View images")
        return saved_images
    
    def check_api_quota(self) -> dict:
        """Check if the API key is valid and has quota."""
        if not self.api_key:
            return {"status": "error", "message": "No API key configured"}
        
        # Make a simple test request
        try:
            url = "https://maps.googleapis.com/maps/api/streetview/metadata"
            params = {
                'location': '40.7580,-73.9855',  # Times Square
                'key': self.api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get('status') == 'OK':
                return {"status": "ok", "message": "API key is valid"}
            else:
                return {"status": "error", "message": f"API returned: {data.get('status')}"}
                
        except Exception as e:
            return {"status": "error", "message": f"API test failed: {e}"}


def main():
    """Test the Street View fetcher."""
    fetcher = StreetViewFetcher()
    
    # Test coordinates (Houston area)
    lat, lon = 29.717038748344443, -95.40236732775882
    
    print("Testing Street View fetcher...")
    
    # Check API quota first
    quota_status = fetcher.check_api_quota()
    print(f"API Status: {quota_status}")
    
    if quota_status['status'] == 'ok':
        try:
            images = fetcher.fetch_images(lat, lon)
            print(f"Successfully fetched {len(images)} images:")
            for img in images:
                print(f"  - {img}")
        except Exception as e:
            print(f"Error: {e}")
    else:
        print("Cannot fetch images due to API issues")


if __name__ == "__main__":
    main()
