/**
 * Check if geocoding result is valid and matches the input location
 */
function isValidLocationMatch(inputLocation, geocodingResult) {
  if (!geocodingResult || !geocodingResult.displayName) {
    return false;
  }
  
  const inputLower = inputLocation.toLowerCase().trim();
  const displayNameLower = geocodingResult.displayName.toLowerCase();
  
  // Extract the main location name (first part before comma)
  const mainLocation = displayNameLower.split(',')[0].trim();
  
  // Check if input is very short (less than 4 characters) - require stricter matching
  if (inputLower.length < 4) {
    // For very short inputs, require high similarity (at least 80%)
    const similarity = calculateSimilarity(inputLower, mainLocation);
    if (similarity < 0.8) {
      return false;
    }
    // Also check if it's an exact substring match
    if (!mainLocation.includes(inputLower) && !inputLower.includes(mainLocation)) {
      return false;
    }
  }
  
  // Check if the main location name contains the input or vice versa
  const containsMatch = mainLocation.includes(inputLower) || inputLower.includes(mainLocation);
  
  // Calculate similarity score
  const similarity = calculateSimilarity(inputLower, mainLocation);
  
  // For inputs 4+ characters, require either containment or high similarity (at least 65%)
  // For shorter inputs, we already handled above
  if (inputLower.length >= 4) {
    return containsMatch || similarity >= 0.65;
  }
  
  // For very short inputs, we already validated above
  return true;
}

/**
 * Calculate similarity between two strings (simple Levenshtein-based)
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Nominatim Geocoding API
 * Geocodes location names to coordinates with validation
 */
export async function geocodeLocation(location) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'TourismApp/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding API request failed');
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const result = {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name,
      importance: data[0].importance || 0,
      type: data[0].type || ''
    };
    
    // Validate that the result actually matches the input location
    if (!isValidLocationMatch(location, result)) {
      return null;
    }
    
    // For very low importance scores or short inputs, be more strict (likely false positives)
    // Importance score ranges from 0 to 1, where 1 is most important
    if (location.length < 4) {
      // For short inputs (like "xyr"), require higher importance (at least 0.4)
      if (result.importance < 0.4) {
        return null;
      }
    } else if (result.importance < 0.2) {
      // For longer inputs, still reject very low importance results
      return null;
    }
    
    return {
      lat: result.lat,
      lon: result.lon,
      displayName: result.displayName
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to geocode location');
  }
}

/**
 * Open-Meteo Weather API
 * Fetches current weather data for given coordinates
 */
export async function fetchWeather(lat, lon) {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation_probability&timezone=auto`
    );
    
    if (!response.ok) {
      throw new Error('Weather API request failed');
    }
    
    const data = await response.json();
    
    if (!data.current) {
      throw new Error('Invalid weather data received');
    }
    
    return {
      temperature: Math.round(data.current.temperature_2m),
      precipitationProbability: Math.round(data.current.precipitation_probability)
    };
  } catch (error) {
    console.error('Weather API error:', error);
    throw new Error('Failed to fetch weather data');
  }
}

/**
 * Overpass API for Tourism Places
 * Queries OpenStreetMap for tourist attractions
 */
export async function fetchTouristPlaces(lat, lon) {
  try {
    const query = `
      [out:json];
      (
        node["tourism"](around:10000,${lat},${lon});
        node["historic"](around:10000,${lat},${lon});
        node["leisure"="park"](around:10000,${lat},${lon});
      );
      out body;
    `;
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`
    });
    
    if (!response.ok) {
      throw new Error('Overpass API request failed');
    }
    
    const data = await response.json();
    
    if (!data.elements || data.elements.length === 0) {
      return [];
    }
    
    // Extract and filter places
    const places = data.elements
      .filter(element => element.tags && element.tags.name)
      .map(element => ({
        name: element.tags.name,
        type: element.tags.tourism || element.tags.historic || element.tags.leisure || 'attraction'
      }))
      .slice(0, 5);
    
    return places;
  } catch (error) {
    console.error('Overpass API error:', error);
    throw new Error('Failed to fetch tourist places');
  }
}

/**
 * Claude API for Natural Language Processing
 * Analyzes user input and determines intent
 */
export async function analyzeWithClaude(userInput, apiKey) {
  try {
    // Try the specified model first, fallback to common models
    const models = ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'];
    let lastError = null;
    
    for (const model of models) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 1000,
            messages: [
              {
                role: 'user',
                content: `Analyze this tourism query and respond with JSON only: "${userInput}"
                
                Determine:
                1. Does the user want weather information? (true/false)
                2. Does the user want places/attractions information? (true/false)
                3. What is the location name? (extract the city/location name)
                
                Respond ONLY with valid JSON in this exact format:
                {
                  "needsWeather": true/false,
                  "needsPlaces": true/false,
                  "location": "location name"
                }`
              }
            ]
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          lastError = new Error(errorData.error?.message || 'Claude API request failed');
          continue; // Try next model
        }
        
        const data = await response.json();
        const content = data.content[0].text;
        
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          lastError = new Error('Invalid response format from Claude');
          continue;
        }
        
        const analysis = JSON.parse(jsonMatch[0]);
        return analysis;
      } catch (err) {
        lastError = err;
        continue;
      }
    }
    
    throw lastError || new Error('All Claude API models failed');
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to analyze query with Claude API');
  }
}

