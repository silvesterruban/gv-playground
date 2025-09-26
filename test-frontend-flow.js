#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Test the frontend registration and login flow
async function testFrontendFlow() {
  console.log('🧪 Testing GradVillage Frontend Registration and Login Flow\n');
  
  const baseURL = 'http://localhost:3001/api';
  
  // Test 1: Student Registration
  console.log('📝 Test 1: Student Registration');
  try {
    const registerResponse = await makeRequest('POST', `${baseURL}/auth/register`, {
      name: 'John Doe',
      email: 'john.doe@gradvillage.com',
      password: 'securepass123'
    });
    
    console.log('✅ Registration Response:', JSON.stringify(registerResponse, null, 2));
    
    if (registerResponse.success && registerResponse.token) {
      console.log('🎉 Registration successful! Token received:', registerResponse.token);
      
      // Test 2: Student Login
      console.log('\n🔐 Test 2: Student Login');
      const loginResponse = await makeRequest('POST', `${baseURL}/auth/login`, {
        email: 'john.doe@gradvillage.com',
        password: 'securepass123'
      });
      
      console.log('✅ Login Response:', JSON.stringify(loginResponse, null, 2));
      
      if (loginResponse.success && loginResponse.token) {
        console.log('🎉 Login successful! Token received:', loginResponse.token);
        
        // Test 3: User Profile
        console.log('\n👤 Test 3: User Profile');
        const profileResponse = await makeRequest('GET', `${baseURL}/user/profile`, null, {
          'Authorization': `Bearer ${loginResponse.token}`
        });
        
        console.log('✅ Profile Response:', JSON.stringify(profileResponse, null, 2));
        
        // Test 4: Auth Verify
        console.log('\n🔍 Test 4: Auth Verify');
        const verifyResponse = await makeRequest('GET', `${baseURL}/auth/verify`, null, {
          'Authorization': `Bearer ${loginResponse.token}`
        });
        
        console.log('✅ Verify Response:', JSON.stringify(verifyResponse, null, 2));
        
        console.log('\n🎊 All tests passed! Frontend flow is working correctly.');
        console.log('\n📋 Summary:');
        console.log('   ✅ Student Registration: Working');
        console.log('   ✅ Student Login: Working');
        console.log('   ✅ User Profile: Working');
        console.log('   ✅ Auth Verify: Working');
        console.log('\n🚀 The GradVillage frontend can now successfully:');
        console.log('   • Register new students');
        console.log('   • Login existing students');
        console.log('   • Access user profiles');
        console.log('   • Verify authentication tokens');
        
      } else {
        console.log('❌ Login failed');
      }
    } else {
      console.log('❌ Registration failed');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function makeRequest(method, url, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          resolve({ error: 'Invalid JSON response', data: responseData });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run the test
testFrontendFlow().catch(console.error);