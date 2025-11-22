import { useState, useEffect } from 'react';
import { parentAgent } from './agents/parentAgent.js';

function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState(() => {
    // Load API key from localStorage if available
    return localStorage.getItem('claude_api_key') || '';
  });

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('claude_api_key', apiKey);
    } else {
      localStorage.removeItem('claude_api_key');
    }
  }, [apiKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    // API key is optional - system works without it
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await parentAgent(query, apiKey.trim() || null);
      
      if (response.success) {
        setResult(response);
      } else {
        setError(response.error || 'An error occurred');
      }
    } catch (err) {
      setError(err.message || 'Failed to process your request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🌍 Multi-Agent Tourism System
          </h1>
          <p className="text-gray-600">
            Ask about weather and places to visit in any location
          </p>
        </div>

        {/* API Key Input - Optional */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claude API Key <span className="text-gray-500 font-normal">(Optional - for enhanced AI analysis)</span>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Anthropic Claude API key (optional)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="mt-2 text-xs text-gray-500">
            The system works without an API key using smart heuristics. Adding a Claude API key provides enhanced natural language understanding.
            Your API key is stored locally and never sent to any server except Anthropic's API.
          </p>
        </div>

        {/* Query Input */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter your query
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., I'm going to Bangalore, what is the temperature there? And what are the places I can visit?"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? 'Processing...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600">Processing your request...</p>
          </div>
        )}

        {/* Error Display */}
        {error && !loading && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-base text-red-700 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {result && !loading && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Results for {result.location || 'your query'}
            </h2>

            {/* Weather Information */}
            {result.results?.weather && result.results.weather.success && (
              <div className="border-l-4 border-blue-500 bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                  <span className="mr-2">🌤️</span>
                  Weather Information
                </h3>
                <p className="text-gray-700 text-lg">
                  {result.results.weather.message}
                </p>
                {result.results.weather.data && (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Temperature:</span>
                      <span className="ml-2 font-semibold text-gray-800">
                        {result.results.weather.data.temperature}°C
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Rain Chance:</span>
                      <span className="ml-2 font-semibold text-gray-800">
                        {result.results.weather.data.precipitationProbability}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Places Information */}
            {result.results?.places && result.results.places.success && (
              <div className="border-l-4 border-green-500 bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">📍</span>
                  Tourist Attractions
                </h3>
                {result.results.places.places && result.results.places.places.length > 0 ? (
                  <ul className="space-y-2">
                    {result.results.places.places.map((place, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-600 mr-2">•</span>
                        <span className="text-gray-700">{place.name}</span>
                        <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          {place.type}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-700">{result.results.places.message}</p>
                )}
              </div>
            )}

            {/* Combined Message */}
            {result.message && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Summary</h3>
                <p className="text-gray-700 whitespace-pre-line">{result.message}</p>
              </div>
            )}
          </div>
        )}

        {/* Example Queries */}
        {!result && !loading && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Example Queries</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="cursor-pointer hover:text-indigo-600" onClick={() => setQuery("I'm going to go to Bangalore, let's plan my trip.")}>
                • "I'm going to go to Bangalore, let's plan my trip."
              </p>
              <p className="cursor-pointer hover:text-indigo-600" onClick={() => setQuery("I'm going to go to Bangalore, what is the temperature there?")}>
                • "I'm going to go to Bangalore, what is the temperature there?"
              </p>
              <p className="cursor-pointer hover:text-indigo-600" onClick={() => setQuery("I'm going to go to Bangalore, what is the temperature there? And what are the places I can visit?")}>
                • "I'm going to go to Bangalore, what is the temperature there? And what are the places I can visit?"
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

