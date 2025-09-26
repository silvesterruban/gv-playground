const { Client } = require('pg');

// Test different connection parameters
const testConnections = [
  {
    name: 'Test 1: Default postgres database',
    config: {
      host: 'gradvillage-dev1-db.c69qc6wichwr.us-east-1.rds.amazonaws.com',
      port: 5432,
      database: 'postgres',
      user: 'gradvillage_admin',
      password: process.argv[2] || 'test',
      ssl: false
    }
  },
  {
    name: 'Test 2: Try with SSL',
    config: {
      host: 'gradvillage-dev1-db.c69qc6wichwr.us-east-1.rds.amazonaws.com',
      port: 5432,
      database: 'postgres',
      user: 'gradvillage_admin',
      password: process.argv[2] || 'test',
      ssl: { rejectUnauthorized: false }
    }
  }
];

async function testConnection(testConfig) {
  const client = new Client(testConfig.config);
  
  try {
    console.log(`\n🔍 ${testConfig.name}...`);
    await client.connect();
    console.log('✅ Connection successful!');
    
    // Test a simple query
    const result = await client.query('SELECT current_user, current_database()');
    console.log('📊 Query result:', result.rows[0]);
    
    await client.end();
    return true;
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    await client.end();
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing database connections...\n');
  
  for (const test of testConnections) {
    const success = await testConnection(test);
    if (success) {
      console.log('🎉 Found working connection!');
      return;
    }
  }
  
  console.log('\n❌ All connection tests failed.');
  console.log('💡 Possible issues:');
  console.log('   - Incorrect password');
  console.log('   - User does not exist');
  console.log('   - Security group restrictions');
  console.log('   - Network connectivity issues');
}

if (process.argv.length < 3) {
  console.log('Usage: node test-db.js <password>');
  process.exit(1);
}

runTests(); 