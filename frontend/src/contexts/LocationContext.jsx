import { createContext, useContext, useState, useCallback } from 'react'

const LocationContext = createContext()

export const useLocation = () => {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}

// Reverse geocoding service using OpenStreetMap Nominatim (free)
const reverseGeocode = async (lat, lng) => {
  try {
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Storm-App/1.0'
        },
        signal: controller.signal
      }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data && data.address) {
      const { city, town, village, county, state, state_district, country } = data.address
      const cityName = city || town || village || county || 'Unknown Location'
      
      // Handle different naming conventions for states/provinces
      let stateName = state || state_district
      
      // Special handling for different countries
      if (country === 'United States') {
        stateName = state || state_district
      } else if (country) {
        stateName = country
      }
      
      return {
        city: cityName,
        state: stateName || '',
        fullName: stateName ? `${cityName}, ${stateName}` : cityName
      }
    }
    
    return {
      city: 'Unknown Location',
      state: '',
      fullName: 'Unknown Location'
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('Geocoding request timed out')
    } else {
      console.warn('Geocoding failed:', error.message)
    }
    return {
      city: 'Unknown Location',
      state: '',
      fullName: 'Unknown Location'
    }
  }
}

export const LocationProvider = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState({
    city: 'Houston',
    state: 'Texas',
    fullName: 'Houston, Texas'
  })
  const [isLoading, setIsLoading] = useState(false)
  
  // Cache to avoid repeated API calls for the same coordinates
  const [geocodeCache] = useState(new Map())
  
  const updateLocation = useCallback(async (lat, lng) => {
    // Round coordinates to reduce cache size and API calls
    const roundedLat = Math.round(lat * 100) / 100
    const roundedLng = Math.round(lng * 100) / 100
    const cacheKey = `${roundedLat},${roundedLng}`
    
    // Check cache first
    if (geocodeCache.has(cacheKey)) {
      const cachedLocation = geocodeCache.get(cacheKey)
      setCurrentLocation(cachedLocation)
      return cachedLocation
    }
    
    setIsLoading(true)
    try {
      const location = await reverseGeocode(lat, lng)
      
      // Cache the result
      geocodeCache.set(cacheKey, location)
      
      // Limit cache size to prevent memory issues
      if (geocodeCache.size > 100) {
        const firstKey = geocodeCache.keys().next().value
        geocodeCache.delete(firstKey)
      }
      
      setCurrentLocation(location)
      setIsLoading(false)
      return location
    } catch (error) {
      setIsLoading(false)
      console.error('Location update failed:', error)
      return currentLocation
    }
  }, [geocodeCache])
  
  const value = {
    currentLocation,
    isLoading,
    updateLocation
  }
  
  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  )
}
