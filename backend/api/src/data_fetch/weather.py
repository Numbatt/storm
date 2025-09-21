"""
Weather Data Fetcher
Fetches rainfall forecast data for flood risk assessment.
"""

import requests
import yaml
from typing import Optional
import random
import os


class WeatherFetcher:
    def __init__(self, config_path: str = "config.yaml"):
        """Initialize with configuration file."""
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Read API key from environment variable
        self.api_key = os.getenv('OPENWEATHER_API_KEY', 'YOUR_OPENWEATHER_API_KEY')
        self.base_url = "https://api.openweathermap.org/data/2.5"
    
    def get_rainfall(self, lat: float, lon: float) -> float:
        """
        Get rainfall forecast for the next 24 hours.
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            Rainfall amount in mm
        """
        if self.api_key == "YOUR_OPENWEATHER_API_KEY":
            print("⚠️ Warning: Using mock data - OpenWeather API key not configured")
            return self._get_mock_rainfall()
        
        try:
            # Get current weather
            current_url = f"{self.base_url}/weather"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric'
            }
            
            response = requests.get(current_url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            # Extract rainfall data
            rainfall_1h = 0
            if 'rain' in data:
                rainfall_1h = data['rain'].get('1h', 0)
            
            # Get forecast for better 24h estimate
            forecast_url = f"{self.base_url}/forecast"
            forecast_params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric',
                'cnt': 8  # Next 24 hours (8 * 3-hour periods)
            }
            
            forecast_response = requests.get(forecast_url, params=forecast_params)
            forecast_response.raise_for_status()
            
            forecast_data = forecast_response.json()
            
            # Sum up rainfall for next 24 hours
            total_rainfall = 0
            for item in forecast_data['list']:
                if 'rain' in item:
                    total_rainfall += item['rain'].get('3h', 0)
            
            # Use the higher of current + extrapolated or forecast
            extrapolated_24h = rainfall_1h * 24
            final_rainfall = max(total_rainfall, extrapolated_24h)
            
            print(f"🌧️ Rainfall forecast (24h): {final_rainfall:.1f}mm")
            return final_rainfall
            
        except requests.RequestException as e:
            print(f"⚠️ Error fetching weather data: {e}")
            return self._get_mock_rainfall()
    
    def _get_mock_rainfall(self) -> float:
        """Generate mock rainfall data for testing."""
        # Generate realistic rainfall amounts
        # 70% chance of light rain (0-10mm)
        # 20% chance of moderate rain (10-25mm)
        # 10% chance of heavy rain (25-50mm)
        
        rand = random.random()
        
        if rand < 0.7:
            rainfall = random.uniform(0, 10)
        elif rand < 0.9:
            rainfall = random.uniform(10, 25)
        else:
            rainfall = random.uniform(25, 50)
        
        print(f"🌧️ Mock rainfall forecast (24h): {rainfall:.1f}mm")
        return rainfall
    
    def get_current_weather(self, lat: float, lon: float) -> Optional[dict]:
        """
        Get current weather conditions.
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            Dictionary with current weather data or None if unavailable
        """
        if self.api_key == "YOUR_OPENWEATHER_API_KEY":
            print("⚠️ Warning: Using mock data - OpenWeather API key not configured")
            return self._get_mock_current_weather()
        
        try:
            current_url = f"{self.base_url}/weather"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric'
            }
            
            response = requests.get(current_url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            current_weather = {
                'temperature': data['main']['temp'],
                'humidity': data['main']['humidity'],
                'description': data['weather'][0]['description'],
                'pressure': data['main']['pressure'],
                'wind_speed': data.get('wind', {}).get('speed', 0)
            }
            
            print(f"🌤️ Current weather: {current_weather['temperature']:.1f}°C, {current_weather['description']}")
            return current_weather
            
        except requests.RequestException as e:
            print(f"⚠️ Error fetching current weather: {e}")
            return self._get_mock_current_weather()
    
    def get_rainfall_forecast(self, lat: float, lon: float, hours: int = 24) -> dict:
        """
        Get detailed rainfall forecast.
        
        Args:
            lat: Latitude
            lon: Longitude
            hours: Number of hours to forecast (default: 24)
            
        Returns:
            Dictionary with rainfall forecast data
        """
        total_rainfall = self.get_rainfall(lat, lon)
        
        # Mock detailed forecast data based on total rainfall
        # In a real implementation, this would parse detailed forecast data
        peak_intensity = total_rainfall / 6 if total_rainfall > 0 else 0  # Assume peak is 1/6 of total
        
        # Determine risk level based on rainfall
        if total_rainfall < 5:
            risk_level = "LOW"
        elif total_rainfall < 15:
            risk_level = "MEDIUM"
        elif total_rainfall < 30:
            risk_level = "HIGH"
        else:
            risk_level = "VERY_HIGH"
        
        return {
            'total_rainfall_mm': total_rainfall,
            'peak_intensity_mm_per_hour': peak_intensity,
            'forecast_hours': hours,
            'risk_level': risk_level,
            'confidence': 'Medium'  # Mock confidence level
        }
    
    def _get_mock_current_weather(self) -> dict:
        """Generate mock current weather data."""
        return {
            'temperature': random.uniform(15, 35),
            'humidity': random.uniform(40, 90),
            'description': random.choice(['clear sky', 'few clouds', 'scattered clouds', 'overcast', 'light rain']),
            'pressure': random.uniform(1000, 1020),
            'wind_speed': random.uniform(0, 15)
        }


def main():
    """Test the WeatherFetcher with sample coordinates."""
    fetcher = WeatherFetcher()
    
    # Test coordinates (Miami - known for rain)
    lat, lon = 25.7617, -80.1918
    
    print(f"Fetching weather data for coordinates: {lat}, {lon}")
    
    # Get rainfall forecast
    rainfall = fetcher.get_rainfall(lat, lon)
    print(f"✅ 24h Rainfall: {rainfall:.1f}mm")


if __name__ == "__main__":
    main()