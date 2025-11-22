import { analyzeWithClaude } from '../utils/api.js';
import { weatherAgent } from './weatherAgent.js';
import { placesAgent } from './placesAgent.js';
import { geocodeLocation } from '../utils/api.js';

/**
 * Enhanced heuristic-based intent analysis
 * Extracts location and determines user needs without requiring Claude API
 */
function analyzeIntent(userInput) {
  const lowerInput = userInput.toLowerCase();
  
  // Weather-related keywords
  const weatherKeywords = [
    'weather', 'temperature', 'temp', 'rain', 'raining', 'precipitation',
    'sunny', 'cloudy', 'cold', 'hot', 'warm', 'cool', 'forecast', 'climate'
  ];
  
  // Places-related keywords
  const placesKeywords = [
    'place', 'places', 'visit', 'visiting', 'attraction', 'attractions',
    'tourist', 'tourism', 'sightseeing', 'sights', 'see', 'explore',
    'plan', 'planning', 'trip', 'travel', 'destination', 'landmark',
    'monument', 'museum', 'park', 'beach', 'temple', 'church', 'palace'
  ];
  
  const needsWeather = weatherKeywords.some(keyword => lowerInput.includes(keyword));
  const needsPlaces = placesKeywords.some(keyword => lowerInput.includes(keyword));
  
  return { needsWeather, needsPlaces };
}

/**
 * Enhanced location extraction from user input
 */
function extractLocation(userInput) {
  const words = userInput.split(/\s+/);
  let potentialLocation = '';
  
  // Common stop words to filter out
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'what', 'where', 'when', 'how', 'is', 'are', 'was', 'were', 'there', 'here', 'this', 'that', 'go', 'going', 'to', 'in', 'at', 'near', 'around', 'visit', 'visiting', 'tell', 'me', 'about', 'i', 'am', 'i\'m', 'im'];
  
  // Pattern 1a: "going to go to [location]" - handle this first to avoid capturing "go to"
  const goingToGoToPattern = /going\s+to\s+go\s+to\s+([^,?!.]+?)(?:[,?!.]|$)/i;
  const goingToGoToMatch = userInput.match(goingToGoToPattern);
  if (goingToGoToMatch && goingToGoToMatch[1]) {
    let rawLocation = goingToGoToMatch[1].trim();
    // Clean up the location - remove stop words
    potentialLocation = rawLocation.split(/\s+/)
      .filter(w => {
        const clean = w.toLowerCase().replace(/[.,!?;:]/g, '');
        return !stopWords.includes(clean) && clean.length > 0;
      })
      .join(' ')
      .trim();
    // If filtering removed everything, use the raw location (might still work)
    if (!potentialLocation || potentialLocation.length < 2) {
      potentialLocation = rawLocation.replace(/[.,!?;:]/g, '').trim();
    }
    if (potentialLocation && potentialLocation.length >= 2) {
      return potentialLocation;
    }
  }
  
  // Pattern 1b: "going to [location]" (without the extra "go to")
  const goingToPattern = /going\s+to\s+([^,?!.]+?)(?:[,?!.]|$)/i;
  const goingToMatch = userInput.match(goingToPattern);
  if (goingToMatch && goingToMatch[1]) {
    let rawLocation = goingToMatch[1].trim();
    // Clean up the location - remove stop words
    potentialLocation = rawLocation.split(/\s+/)
      .filter(w => {
        const clean = w.toLowerCase().replace(/[.,!?;:]/g, '');
        return !stopWords.includes(clean) && clean.length > 0;
      })
      .join(' ')
      .trim();
    // If filtering removed everything, use the raw location
    if (!potentialLocation || potentialLocation.length < 2) {
      potentialLocation = rawLocation.replace(/[.,!?;:]/g, '').trim();
    }
    // If we still have something after filtering, use it
    if (potentialLocation && potentialLocation.length >= 2) {
      return potentialLocation;
    }
  }
  
  // Pattern 2: "in [location]" or "at [location]"
  const inAtPattern = /(?:in|at)\s+([^,?!.]+?)(?:[,?!.]|$)/i;
  const inAtMatch = userInput.match(inAtPattern);
  if (inAtMatch && inAtMatch[1]) {
    potentialLocation = inAtMatch[1].trim();
    potentialLocation = potentialLocation.split(/\s+/)
      .filter(w => {
        const clean = w.toLowerCase().replace(/[.,!?;:]/g, '');
        return !stopWords.includes(clean) && clean.length > 0;
      })
      .join(' ')
      .trim();
    if (potentialLocation) return potentialLocation;
  }
  
  // Pattern 3: "to [location]" (but not "going to")
  const toPattern = /(?:^|\s)to\s+([^,?!.]+?)(?:[,?!.]|$)/i;
  const toMatch = userInput.match(toPattern);
  if (toMatch && toMatch[1] && !userInput.toLowerCase().includes('going to')) {
    potentialLocation = toMatch[1].trim();
    potentialLocation = potentialLocation.split(/\s+/)
      .filter(w => {
        const clean = w.toLowerCase().replace(/[.,!?;:]/g, '');
        return !stopWords.includes(clean) && clean.length > 0;
      })
      .join(' ')
      .trim();
    if (potentialLocation) return potentialLocation;
  }
  
  // Pattern 4: Look for location indicators in word sequence
  const locationIndicators = ['to', 'in', 'at', 'near', 'around', 'visit', 'visiting'];
  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/[.,!?;:]/g, '');
    if (locationIndicators.includes(word) && word !== 'to' || (word === 'to' && i > 0 && words[i-1].toLowerCase() !== 'going')) {
      if (i + 1 < words.length) {
        // Get next few words as potential location (up to 5 words for multi-word cities)
        const locationWords = words.slice(i + 1, i + 6)
          .map(w => w.replace(/[.,!?;:]/g, ''))
          .filter(w => {
            const clean = w.toLowerCase();
            return !stopWords.includes(clean) && clean.length > 0;
          });
        potentialLocation = locationWords.join(' ').trim();
        if (potentialLocation) break;
      }
    }
  }
  
  // Pattern 5: Try last few words (common pattern: "tell me about Paris")
  if (!potentialLocation) {
    const lastWords = words.slice(-5)
      .map(w => w.replace(/[.,!?;:]/g, ''))
      .filter(w => {
        const clean = w.toLowerCase();
        return w.length > 0 && !stopWords.includes(clean);
      });
    potentialLocation = lastWords.join(' ').trim();
  }
  
  // Pattern 6: If still nothing, try the whole input (might be just a city name)
  if (!potentialLocation || potentialLocation.length < 2) {
    potentialLocation = userInput.trim().replace(/[.,!?;:]/g, '');
  }
  
  return potentialLocation;
}

/**
 * Parent Tourism AI Agent
 * Orchestrates child agents based on user input analysis
 * Works with or without Claude API (free mode uses heuristics)
 */
export async function parentAgent(userInput, claudeApiKey = null) {
  try {
    let analysis;
    let validatedLocation = '';
    
    // Step 1: Try Claude API if key is provided (optional enhancement)
    if (claudeApiKey && claudeApiKey.trim()) {
      try {
        analysis = await analyzeWithClaude(userInput, claudeApiKey);
        // Try to validate the location extracted by Claude
        if (analysis.location) {
          const geoData = await geocodeLocation(analysis.location);
          if (geoData) {
            validatedLocation = geoData.displayName.split(',')[0];
          }
        }
      } catch (error) {
        // Fallback to heuristic if Claude fails
        console.warn('Claude analysis failed, using heuristic fallback:', error);
      }
    }
    
    // Step 2: Use heuristic analysis (primary method, works without API key)
    if (!validatedLocation) {
      // Extract location using heuristics
      const potentialLocation = extractLocation(userInput);
      
      if (!potentialLocation || potentialLocation.length < 2) {
        return {
          success: false,
          error: "I couldn't find a location in your query. Please include a city or place name.",
          location: ''
        };
      }
      
      // Try multiple variations of the location name for better matching
      const locationVariations = [
        potentialLocation,
        potentialLocation.split(',')[0], // Remove any trailing parts
        potentialLocation.split(' ').slice(0, 3).join(' ') // First 3 words for multi-word cities
      ];
      
      let geoData = null;
      for (const location of locationVariations) {
        if (!location || location.length < 2) continue;
        try {
          geoData = await geocodeLocation(location);
          if (geoData) break;
        } catch (error) {
          console.warn(`Geocoding failed for "${location}":`, error);
          continue;
        }
      }
      
      if (!geoData) {
        return {
          success: false,
          error: "I don't know if this place exists. Could you please verify the location name?",
          location: potentialLocation
        };
      }
      
      validatedLocation = geoData.displayName.split(',')[0];
      
      // Use heuristic intent analysis if Claude didn't work
      if (!analysis) {
        const intent = analyzeIntent(userInput);
        analysis = {
          needsWeather: intent.needsWeather,
          needsPlaces: intent.needsPlaces,
          location: validatedLocation
        };
      }
    }
    
    // Override location with validated one
    analysis.location = validatedLocation;
    
    // Step 3: Determine which agents to call
    const results = {
      weather: null,
      places: null,
      location: validatedLocation
    };
    
    // Step 4: Call appropriate child agents
    if (analysis.needsWeather) {
      results.weather = await weatherAgent(validatedLocation);
    }
    
    if (analysis.needsPlaces) {
      results.places = await placesAgent(validatedLocation);
    }
    
    // If neither is explicitly requested, default to places
    if (!analysis.needsWeather && !analysis.needsPlaces) {
      results.places = await placesAgent(validatedLocation);
    }
    
    // Step 5: Format combined response
    let response = '';
    const parts = [];
    
    if (results.weather && results.weather.success) {
      parts.push(results.weather.message);
    }
    
    if (results.places && results.places.success) {
      if (results.places.places && results.places.places.length > 0) {
        parts.push(`Here are some tourist attractions in ${validatedLocation}:`);
      } else {
        parts.push(results.places.message);
      }
    }
    
    response = parts.join('\n\n');
    
    return {
      success: true,
      message: response,
      results: results
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to process your request'
    };
  }
}

