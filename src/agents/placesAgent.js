import { geocodeLocation, fetchTouristPlaces } from '../utils/api.js';

/**
 * Places Agent (Child Agent 2)
 * Fetches tourist attractions for a given location
 */
export async function placesAgent(location) {
  try {
    // Step 1: Geocode the location
    const geoData = await geocodeLocation(location);
    
    if (!geoData) {
      return {
        success: false,
        error: 'Location not found'
      };
    }
    
    // Step 2: Fetch tourist places
    const places = await fetchTouristPlaces(geoData.lat, geoData.lon);
    
    if (places.length === 0) {
      return {
        success: true,
        message: `No tourist attractions found near ${location}`,
        places: []
      };
    }
    
    // Step 3: Format response
    const placesList = places.map(p => p.name).join(', ');
    const response = `Here are some tourist attractions in ${location}: ${placesList}`;
    
    return {
      success: true,
      message: response,
      places: places
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to fetch tourist places'
    };
  }
}

