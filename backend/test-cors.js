// backend/test-cors.js - Specific CORS testing
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function testCORS() {
  console.log('🌐 Testing CORS Configuration...\n');

  // Test 1: Basic request with Origin header
  console.log('1. Testing basic request with Origin header...');
  try {
    const response = await axios.get(`${API_BASE}/health`, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    console.log('   ✅ Request successful');
    
    // Check for CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': response.headers['access-control-allow-headers'],
      'Access-Control-Allow-Credentials': response.headers['access-control-allow-credentials']
    };
    
    console.log('   📋 CORS Headers found:');
    for (const [header, value] of Object.entries(corsHeaders)) {
      if (value) {
        console.log(`   ✅ ${header}: ${value}`);
      } else {
        console.log(`   ❌ ${header}: Missing`);
      }
    }
  } catch (error) {
    console.log('   ❌ Request failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Preflight request (OPTIONS)
  console.log('2. Testing preflight request (OPTIONS)...');
  try {
    const response = await axios.options(`${API_BASE}/api/users/login`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    console.log('   ✅ Preflight request successful');
    console.log('   📊 Status:', response.status);
    
    // Check preflight headers
    const preflightHeaders = {
      'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': response.headers['access-control-allow-headers'],
      'Access-Control-Max-Age': response.headers['access-control-max-age']
    };
    
    console.log('   📋 Preflight Headers:');
    for (const [header, value] of Object.entries(preflightHeaders)) {
      if (value) {
        console.log(`   ✅ ${header}: ${value}`);
      } else {
        console.log(`   ❌ ${header}: Missing`);
      }
    }
  } catch (error) {
    console.log('   ❌ Preflight failed:', error.response?.status, error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Different origins
  console.log('3. Testing different origins...');
  
  const testOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'https://malicious-site.com'
  ];
  
  for (const origin of testOrigins) {
    try {
      const response = await axios.get(`${API_BASE}/health`, {
        headers: { 'Origin': origin }
      });
      
      const allowedOrigin = response.headers['access-control-allow-origin'];
      console.log(`   ✅ ${origin}: Allowed (${allowedOrigin})`);
    } catch (error) {
      if (error.response?.status === 403) {
        console.log(`   🛑 ${origin}: Blocked by CORS`);
      } else {
        console.log(`   ❓ ${origin}: ${error.response?.status || 'Unknown error'}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: API request with CORS
  console.log('4. Testing API request with CORS...');
  try {
    const response = await axios.post(`${API_BASE}/api/users/register`, {
      name: 'CORS Test User',
      email: 'cors-test@example.com',
      password: 'TestPass123!'
    }, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   ✅ API request with CORS successful');
    
    const corsOrigin = response.headers['access-control-allow-origin'];
    if (corsOrigin) {
      console.log(`   ✅ CORS Origin: ${corsOrigin}`);
    } else {
      console.log('   ⚠️  No CORS origin header in API response');
    }
    
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('   ✅ API request processed (validation error expected)');
      const corsOrigin = error.response.headers['access-control-allow-origin'];
      if (corsOrigin) {
        console.log(`   ✅ CORS Origin in error response: ${corsOrigin}`);
      } else {
        console.log('   ⚠️  No CORS origin header in error response');
      }
    } else {
      console.log('   ❌ API request failed:', error.response?.status, error.message);
    }
  }

  console.log('\n🎉 CORS testing completed!\n');
  
  console.log('📋 CORS Health Check:');
  console.log('✅ If you see "Access-Control-Allow-Origin" headers - CORS is working');
  console.log('✅ If preflight requests succeed - Complex CORS requests will work');
  console.log('✅ If different origins are handled correctly - Security is working');
}

// Run tests
if (require.main === module) {
  console.log('🚀 Make sure your server is running on localhost:5000');
  console.log('⏳ Starting CORS tests in 3 seconds...\n');
  
  setTimeout(testCORS, 3000);
}

module.exports = testCORS;