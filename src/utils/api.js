/**
 * Nominatim Geocoding API
 * Geocodes location names to coordinates
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
    
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name
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

