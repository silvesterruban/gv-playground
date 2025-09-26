const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection test
async function testDatabaseConnection() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });
    await client.connect();
    console.log('✅ Database connection successful!');
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await testDatabaseConnection();
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'dev1',
    database: dbConnected ? 'connected' : 'disconnected',
    message: 'GradVillage Backend is running!'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to GradVillage Dev1 Backend',
    version: '1.0.0',
    environment: 'dev1',
    endpoints: {
      health: '/health'
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GradVillage Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 