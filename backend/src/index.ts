// backend/src/index.ts - Main entry point
import dotenv from 'dotenv';
import app from './app';
import { PrismaClient } from '@prisma/client';
import { s3Service } from './services/aws/s3Service';
import { sesService } from './services/aws/sesService';
import { startPerformanceMonitoring } from './middleware/performance';

// Load environment variables first
dotenv.config();

const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Initialize AWS resources on startup
async function initializeAWSResources() {
  if (process.env.USE_MOTO === 'true') {
    console.log('🎭 Initializing Moto AWS resources...');
    try {
      await s3Service.ensureBucketExists();
      console.log('✅ Moto AWS resources initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Moto resources:', error);
    }
  }
}

// Graceful shutdown handler
async function gracefulShutdown() {
  console.log('\n🛑 Received shutdown signal, closing server gracefully...');

  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
async function startServer() {
  try {
    // Initialize AWS resources
    await initializeAWSResources();

    // Start the server
    const server = app.listen(Number(PORT), '0.0.0.0', () => {
      console.log('\n🚀 Village Backend Server Started');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 Server: http://localhost:${PORT}`);
      console.log(`📱 Mobile: http://192.168.1.5:${PORT}`);
      console.log(`📊 Health: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/api`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Start performance monitoring
      startPerformanceMonitoring();

      if (process.env.USE_MOTO === 'true') {
        console.log(`🎭 Moto server: ${process.env.MOTO_ENDPOINT}`);
        console.log(`📦 S3 bucket: ${process.env.AWS_BUCKET_NAME}`);
      }

      console.log('\n🎉 Village Platform ready for development!');
      console.log('\n🔧 Available Features:');
      console.log('  ✅ Student Registration & Authentication');
      console.log('  ✅ Student Profile Management');
      console.log('  ✅ Student Verification System');
      console.log('  ✅ Donor Registration & Authentication');
      console.log('  ✅ Donor Dashboard & Analytics');
      console.log('  ✅ Student Discovery for Donors');
      console.log('  ✅ Donor Bookmark System');
      console.log('  ✅ Donation Processing (Stripe/PayPal/Zelle)');
      console.log('  ✅ Tax-Deductible Receipts');
      console.log('  ✅ Admin Management Panel');
      console.log('  ✅ School Verification System');
      console.log('  ✅ File Upload (S3 Integration)');
      console.log('  ✅ Email System (SES Integration)');
      console.log('  ✅ Profile Statistics & Analytics');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer().catch((error) => {
  console.error('❌ Fatal error during startup:', error);
  process.exit(1);
});

export { prisma };