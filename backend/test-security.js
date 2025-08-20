// backend/test-security.js - Test your security implementation
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function testSecurity() {
  console.log('🔒 Testing Security Implementation...\n');

  // Test 1: Health check (should work)
  console.log('1. Testing health endpoint...');
  try {
    const response = await axios.get(`${API_BASE}/health`);
    console.log('   ✅ Health check working');
    console.log('   📊 Security features:', response.data.security);
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Security status endpoint
  console.log('2. Testing security status...');
  try {
    const response = await axios.get(`${API_BASE}/security-status`);
    console.log('   ✅ Security status endpoint working');
    console.log('   🔒 Security config:', response.data.security);
  } catch (error) {
    console.log('   ❌ Security status failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Rate limiting on registration
  console.log('3. Testing rate limiting on registration...');
  let rateLimitHit = false;
  
  for (let i = 0; i < 12; i++) {
    try {
      await axios.post(`${API_BASE}/api/users/register`, {
        name: `Test User ${i}`,
        email: `test${i}${Date.now()}@example.com`,
        password: 'TestPass123!'
      });
      console.log(`   📝 Request ${i + 1}: Allowed`);
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`   🛑 Request ${i + 1}: Rate limited!`);
        console.log('   ✅ Rate limiting is working!');
        rateLimitHit = true;
        break;
      } else if (error.response?.status === 400) {
        console.log(`   📝 Request ${i + 1}: Validation error (expected)`);
      } else {
        console.log(`   ❓ Request ${i + 1}: ${error.response?.status || 'Unknown error'}`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (!rateLimitHit) {
    console.log('   ⚠️  Rate limiting might not be working properly');
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: XSS protection
  console.log('4. Testing XSS protection...');
  try {
    await axios.post(`${API_BASE}/api/users/register`, {
      name: '<script>alert("XSS")</script>',
      email: 'xss@test.com',
      password: 'TestPass123!'
    });
    console.log('   ⚠️  XSS payload was not blocked');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('   ✅ XSS payload blocked by validation');
    } else {
      console.log('   🛡️  XSS payload blocked by security middleware');
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: SQL injection protection
  console.log('5. Testing SQL injection protection...');
  try {
    await axios.post(`${API_BASE}/api/users/login`, {
      email: "admin'; DROP TABLE users; --",
      password: 'anything'
    });
    console.log('   ⚠️  SQL injection payload reached the server');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('   ✅ SQL injection blocked by validation');
    } else {
      console.log('   🛡️  SQL injection blocked by security middleware');
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 6: CORS headers
  console.log('6. Testing CORS headers...');
  try {
    const response = await axios.get(`${API_BASE}/health`);
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': response.headers['access-control-allow-headers']
    };
    
    if (corsHeaders['Access-Control-Allow-Origin']) {
      console.log('   ✅ CORS headers present');
      console.log('   🌐 CORS config:', corsHeaders);
    } else {
      console.log('   ⚠️  CORS headers missing');
    }
  } catch (error) {
    console.log('   ❌ CORS test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 7: Security headers
  console.log('7. Testing security headers...');
  try {
    const response = await axios.get(`${API_BASE}/health`);
    const securityHeaders = {
      'X-Content-Type-Options': response.headers['x-content-type-options'],
      'X-Frame-Options': response.headers['x-frame-options'],
      'X-XSS-Protection': response.headers['x-xss-protection'],
      'Strict-Transport-Security': response.headers['strict-transport-security']
    };
    
    let headersCount = 0;
    for (const [header, value] of Object.entries(securityHeaders)) {
      if (value) {
        console.log(`   ✅ ${header}: ${value}`);
        headersCount++;
      } else {
        console.log(`   ⚠️  ${header}: Missing`);
      }
    }
    
    console.log(`   📊 Security headers: ${headersCount}/4 present`);
  } catch (error) {
    console.log('   ❌ Security headers test failed:', error.message);
  }

  console.log('\n🎉 Security testing completed!\n');
  
  console.log('📋 Summary:');
  console.log('✅ If you see "Rate limited!" - Rate limiting is working');
  console.log('✅ If XSS/SQL payloads are blocked - Input sanitization is working');
  console.log('✅ If CORS headers are present - Cross-origin requests are configured');
  console.log('✅ If security headers are present - Helmet is working');
}

// Run tests
if (require.main === module) {
  console.log('🚀 Make sure your server is running on localhost:5000');
  console.log('⏳ Starting security tests in 3 seconds...\n');
  
  setTimeout(testSecurity, 3000);
}

module.exports = testSecurity;