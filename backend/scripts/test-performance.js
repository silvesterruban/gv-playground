const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testPerformanceMonitoring() {
  console.log('🚀 Testing Performance Monitoring...\n');

  try {
    // Test 1: Get performance dashboard
    console.log('📊 1. Testing Performance Dashboard...');
    const dashboardResponse = await axios.get(`${BASE_URL}/api/performance/dashboard`);
    
    if (dashboardResponse.data.success) {
      const data = dashboardResponse.data.data;
      console.log('✅ Dashboard loaded successfully');
      console.log(`   📈 Uptime: ${Math.round(data.uptime / 60)} minutes`);
      console.log(`   💾 Memory: ${data.system.memory.heapUsed}MB / ${data.system.memory.heapTotal}MB`);
      console.log(`   📊 Requests (last hour): ${data.requests.total}`);
      console.log(`   ⏱️  Avg Response Time: ${data.requests.averageResponseTime}ms`);
      console.log(`   ❌ Error Rate: ${data.requests.errorRate}%`);
      
      if (data.alerts.highMemoryUsage) console.log('   ⚠️  High Memory Usage Alert');
      if (data.alerts.highErrorRate) console.log('   ⚠️  High Error Rate Alert');
      if (data.alerts.slowResponseTime) console.log('   ⚠️  Slow Response Time Alert');
      
      if (data.slowEndpoints.length > 0) {
        console.log('   🐌 Top Slow Endpoints:');
        data.slowEndpoints.slice(0, 3).forEach(endpoint => {
          console.log(`      ${endpoint.endpoint}: ${endpoint.avgTime}ms (${endpoint.count} calls)`);
        });
      }
    } else {
      console.log('❌ Dashboard failed to load');
    }

    console.log('\n📊 2. Testing Real-time Metrics...');
    const metricsResponse = await axios.get(`${BASE_URL}/api/performance/metrics`);
    
    if (metricsResponse.data.success) {
      const metrics = metricsResponse.data.data;
      console.log('✅ Real-time metrics loaded');
      console.log(`   💾 Current Memory: ${metrics.memory.heapUsed}MB`);
      console.log(`   🔗 Active Connections: ${metrics.activeConnections}`);
      console.log(`   ❌ Recent Errors: ${metrics.recentErrors}`);
    } else {
      console.log('❌ Real-time metrics failed to load');
    }

    console.log('\n📊 3. Generating some test traffic...');
    
    // Generate some test requests to see performance data
    const testRequests = [
      { method: 'GET', path: '/api/donors/students?page=1&limit=5' },
      { method: 'GET', path: '/health' },
      { method: 'GET', path: '/api' }
    ];

    for (const testReq of testRequests) {
      try {
        const startTime = Date.now();
        await axios.get(`${BASE_URL}${testReq.path}`);
        const responseTime = Date.now() - startTime;
        console.log(`   ✅ ${testReq.method} ${testReq.path}: ${responseTime}ms`);
      } catch (error) {
        console.log(`   ❌ ${testReq.method} ${testReq.path}: ${error.response?.status || 'Error'}`);
      }
    }

    console.log('\n📊 4. Final Performance Check...');
    const finalDashboard = await axios.get(`${BASE_URL}/api/performance/dashboard`);
    
    if (finalDashboard.data.success) {
      const finalData = finalDashboard.data.data;
      console.log('✅ Final performance summary:');
      console.log(`   📊 Total Requests: ${finalData.requests.total}`);
      console.log(`   ⏱️  Average Response Time: ${finalData.requests.averageResponseTime}ms`);
      console.log(`   💾 Memory Usage: ${finalData.system.memory.heapUsed}MB`);
      console.log(`   🚀 Environment: ${finalData.environment}`);
    }

    console.log('\n🎉 Performance monitoring test completed!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Visit http://localhost:3001/api/performance/dashboard for full dashboard');
    console.log('   2. Monitor logs for performance alerts');
    console.log('   3. Check memory and CPU usage trends');

  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
testPerformanceMonitoring(); 