import { geocodeLocation, fetchWeather } from '../utils/api.js';

/**
 * Weather Agent (Child Agent 1)
 * Fetches current weather information for a given location
 */
export async function weatherAgent(location) {
  try {
    // Step 1: Geocode the location
    const geoData = await geocodeLocation(location);
    
    if (!geoData) {
      return {
        success: false,
        error: 'Location not found'
      };
    }
    
    // Step 2: Fetch weather data
    const weatherData = await fetchWeather(geoData.lat, geoData.lon);
    
    // Step 3: Format response
    const cityName = geoData.displayName.split(',')[0]; // Get city name from display name
    const response = `In ${cityName} it's currently ${weatherData.temperature}°C with a chance of ${weatherData.precipitationProbability}% to rain`;
    
    return {
      success: true,
      message: response,
      data: {
        city: cityName,
        temperature: weatherData.temperature,
        precipitationProbability: weatherData.precipitationProbability
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to fetch weather information'
    };
  }
}

