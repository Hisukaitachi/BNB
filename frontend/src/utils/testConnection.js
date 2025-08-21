// src/utils/testConnection.js - Test if backend is working
import api from '../services/api';

export const testBackendConnection = async () => {
  const results = {
    health: { status: 'untested', message: '', time: null },
    listings: { status: 'untested', message: '', time: null, data: null },
    cors: { status: 'untested', message: '', time: null }
  };

  console.log('🔍 Testing backend connection...');

  // Test 1: Health check
  try {
    const start = Date.now();
    const response = await fetch('http://localhost:5000/health');
    const data = await response.json();
    const time = Date.now() - start;

    if (response.ok) {
      results.health = { 
        status: 'success', 
        message: `Server is running (${time}ms)`, 
        time,
        data 
      };
      console.log('✅ Health check passed:', data);
    } else {
      results.health = { 
        status: 'error', 
        message: `Server error: ${response.status}`, 
        time 
      };
      console.log('❌ Health check failed:', response.status);
    }
  } catch (error) {
    results.health = { 
      status: 'error', 
      message: `Connection failed: ${error.message}`, 
      time: null 
    };
    console.log('❌ Health check error:', error.message);
  }

  // Test 2: API endpoint
  try {
    const start = Date.now();
    const response = await api.getListings();
    const time = Date.now() - start;

    results.listings = { 
      status: 'success', 
      message: `API working (${time}ms)`, 
      time,
      data: response 
    };
    console.log('✅ Listings API test passed:', response);
  } catch (error) {
    results.listings = { 
      status: 'error', 
      message: `API error: ${error.message}`, 
      time: null 
    };
    console.log('❌ Listings API test failed:', error.message);
  }

  // Test 3: CORS
  try {
    const start = Date.now();
    const response = await fetch('http://localhost:5000/api', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    const time = Date.now() - start;

    if (response.ok || response.status === 200 || response.status === 204) {
      results.cors = { 
        status: 'success', 
        message: `CORS configured correctly (${time}ms)`, 
        time 
      };
      console.log('✅ CORS test passed');
    } else {
      results.cors = { 
        status: 'warning', 
        message: `CORS may have issues: ${response.status}`, 
        time 
      };
      console.log('⚠️ CORS test warning:', response.status);
    }
  } catch (error) {
    results.cors = { 
      status: 'error', 
      message: `CORS error: ${error.message}`, 
      time: null 
    };
    console.log('❌ CORS test failed:', error.message);
  }

  return results;
};

// React component to display test results
export const ConnectionTest = () => {
  const [results, setResults] = React.useState(null);
  const [testing, setTesting] = React.useState(false);

  const runTest = async () => {
    setTesting(true);
    const testResults = await testBackendConnection();
    setResults(testResults);
    setTesting(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Backend Connection Test</h2>
      
      <div className="text-center mb-6">
        <button 
          onClick={runTest}
          disabled={testing}
          className="btn-primary disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {results && (
        <div className="space-y-4">
          {Object.entries(results).map(([key, result]) => (
            <div key={key} className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold capitalize">{key} Test</h3>
                <span className="text-2xl">{getStatusIcon(result.status)}</span>
              </div>
              <p className={`text-sm ${getStatusColor(result.status)}`}>
                {result.message}
              </p>
              {result.time && (
                <p className="text-xs text-gray-500 mt-1">
                  Response time: {result.time}ms
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-700 rounded-lg">
        <h3 className="font-semibold mb-2">Expected Results:</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>✅ Health: Server should be running on port 5000</li>
          <li>✅ Listings: API should return listings data</li>
          <li>✅ CORS: Cross-origin requests should be allowed</li>
        </ul>
      </div>
    </div>
  );
};