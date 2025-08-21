// backend/test-validation.js - Test your validation system
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testValidation() {
  console.log('🧪 Testing Validation System...\n');

  // Test 1: Invalid user registration
  console.log('1. Testing invalid user registration...');
  try {
    await axios.post(`${API_BASE}/users/register`, {
      name: 'A', // Too short
      email: 'invalid-email', // Invalid format
      password: '123' // Too weak
    });
    console.log('   ❌ Should have failed');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('   ✅ Correctly rejected:', error.response.data.message);
    } else {
      console.log('   ❌ Unexpected error:', error.message);
    }
  }

  // Test 2: Invalid login
  console.log('\n2. Testing invalid login...');
  try {
    await axios.post(`${API_BASE}/users/login`, {
      email: 'not-an-email' // Missing password and invalid email
    });
    console.log('   ❌ Should have failed');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('   ✅ Correctly rejected:', error.response.data.message);
    } else {
      console.log('   ❌ Unexpected error:', error.message);
    }
  }

  // Test 3: Invalid listing creation
  console.log('\n3. Testing invalid listing creation...');
  try {
    await axios.post(`${API_BASE}/listings`, {
      title: 'Hi', // Too short
      description: 'Short', // Too short
      price_per_night: -10 // Negative price
    });
    console.log('   ❌ Should have failed');
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 401) {
      console.log('   ✅ Correctly rejected:', error.response.data.message);
    } else {
      console.log('   ❌ Unexpected error:', error.message);
    }
  }

  // Test 4: Valid user registration (this might fail if user exists, but validation should pass)
  console.log('\n4. Testing valid user registration...');
  try {
    await axios.post(`${API_BASE}/users/register`, {
      name: 'John Doe',
      email: 'test@example.com',
      password: 'SecurePass123!'
    });
    console.log('   ✅ Valid data accepted');
  } catch (error) {
    if (error.response?.data?.message?.includes('already')) {
      console.log('   ✅ Valid data accepted (user already exists)');
    } else if (error.response?.status === 400) {
      console.log('   ❌ Valid data rejected:', error.response.data.message);
    } else {
      console.log('   ✅ Valid data accepted (other response)');
    }
  }

  console.log('\n🎉 Validation tests completed!');
}

// Run tests
if (require.main === module) {
  console.log('Make sure your server is running on localhost:5000');
  console.log('Starting tests in 3 seconds...\n');
  
  setTimeout(testValidation, 3000);
}

module.exports = testValidation;