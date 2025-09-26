// backend/src/routes/test-endpoints.ts - AWS and system testing endpoints
import { Express } from 'express';
import { s3Service } from '../services/aws/s3Service';
import { sesService } from '../services/aws/sesService';
import { getRateLimitStatus } from '../middleware/rateLimit';

export function setupTestEndpoints(app: Express) {

  // Rate limiting status endpoint
  app.get('/api/test/rate-limit-status', (req, res) => {
    const status = getRateLimitStatus();
    
    res.json({
      success: true,
      message: 'Rate limiting status retrieved',
      data: status,
      timestamp: new Date().toISOString(),
      recommendations: {
        testing: 'Set DISABLE_RATE_LIMIT=true or NODE_ENV=test to disable rate limiting',
        production: 'Set DISABLE_RATE_LIMIT=false and ensure NODE_ENV=production for rate limiting'
      }
    });
  });

  // Test AWS S3 integration
  app.get('/api/test/s3', async (req, res) => {
    try {
      const { uploadUrl, key, downloadUrl } = await s3Service.getSignedUploadUrl(
        'test.txt',
        'text/plain',
        'api-tests'
      );

      res.json({
        success: true,
        message: 'S3 integration working',
        data: {
          upload_url: uploadUrl,
          download_url: downloadUrl,
          key,
          bucket: process.env.AWS_BUCKET_NAME,
          using_moto: process.env.USE_MOTO === 'true',
          moto_endpoint: process.env.MOTO_ENDPOINT
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: 'S3 integration failed',
        details: errorMessage,
        troubleshooting: [
          'Ensure Moto server is running on port 5001',
          'Check AWS credentials in environment variables',
          'Verify S3 bucket configuration'
        ],
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test AWS SES integration
  app.post('/api/test/ses', async (req, res) => {
    try {
      const { email = 'test@example.com', subject = 'SES Test' } = req.body;

      await sesService.sendEmail(
        email,
        subject,
        '<h1>SES Integration Test</h1><p>Email sending via SES is working!</p>',
        'SES Integration Test - Email sending is working!'
      );

      res.json({
        success: true,
        message: 'SES integration working',
        data: {
          email_sent_to: email,
          subject,
          using_moto: process.env.USE_MOTO === 'true',
          moto_endpoint: process.env.MOTO_ENDPOINT
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: 'SES integration failed',
        details: errorMessage,
        troubleshooting: [
          'Check if email addresses are verified in SES',
          'Ensure Moto server is running for development',
          'Verify AWS SES configuration'
        ],
        timestamp: new Date().toISOString()
      });
    }
  });

  // Comprehensive AWS test endpoint
  app.get('/api/test/aws', async (req, res) => {
    try {
      console.log('🧪 Running comprehensive AWS integration test...');

      // Test S3
      const s3Test = await s3Service.getSignedUploadUrl('test.txt', 'text/plain');

      // Test SES
      const verifiedEmails = await sesService.listVerifiedEmails();

      res.json({
        success: true,
        message: 'AWS integration fully functional',
        timestamp: new Date().toISOString(),
        s3: {
          status: 'working',
          bucket: process.env.AWS_BUCKET_NAME,
          upload_url: s3Test.uploadUrl.substring(0, 100) + '...',
          key: s3Test.key
        },
        ses: {
          status: 'working',
          verified_emails_count: verifiedEmails.length,
          verified_emails: verifiedEmails,
          from_email: process.env.EMAIL_FROM
        },
        configuration: {
          moto_enabled: process.env.USE_MOTO === 'true',
          moto_endpoint: process.env.MOTO_ENDPOINT,
          environment: process.env.NODE_ENV || 'development',
          note: process.env.USE_MOTO === 'true'
            ? 'All requests go to your Moto server on port 5001'
            : 'Using production AWS services'
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ AWS integration test failed:', error);

      res.status(500).json({
        success: false,
        error: 'AWS integration test failed',
        details: errorMessage,
        troubleshooting: [
          'Check if Moto server is running: docker ps | grep moto',
          'Test Moto endpoint: curl http://localhost:5001',
          'Check environment variables in .env file',
          'Verify AWS credentials are properly configured',
          'Ensure S3 bucket exists and is accessible',
          'Check SES email verification status'
        ],
        timestamp: new Date().toISOString()
      });
    }
  });

  // Database connection test
  app.get('/api/test/database', async (req, res) => {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      // Simple database query to test connection
      await prisma.$queryRaw`SELECT 1 as test`;

      res.json({
        success: true,
        message: 'Database connection working',
        timestamp: new Date().toISOString()
      });

      await prisma.$disconnect();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: 'Database connection failed',
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  // System health check with all services
  app.get('/api/test/system', async (req, res) => {
    const results = {
      database: { status: 'unknown', error: null },
      s3: { status: 'unknown', error: null },
      ses: { status: 'unknown', error: null }
    };

    // Test database
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$queryRaw`SELECT 1 as test`;
      results.database.status = 'working';
      await prisma.$disconnect();
    } catch (error) {
      results.database.status = 'failed';
      results.database.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test S3
    try {
      await s3Service.getSignedUploadUrl('system-test.txt', 'text/plain');
      results.s3.status = 'working';
    } catch (error) {
      results.s3.status = 'failed';
      results.s3.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test SES
    try {
      await sesService.listVerifiedEmails();
      results.ses.status = 'working';
    } catch (error) {
      results.ses.status = 'failed';
      results.ses.error = error instanceof Error ? error.message : 'Unknown error';
    }

    const allWorking = Object.values(results).every(service => service.status === 'working');

    res.status(allWorking ? 200 : 500).json({
      success: allWorking,
      message: allWorking ? 'All systems operational' : 'Some systems are failing',
      results,
      timestamp: new Date().toISOString(),
      environment: {
        node_env: process.env.NODE_ENV || 'development',
        using_moto: process.env.USE_MOTO === 'true',
        moto_endpoint: process.env.MOTO_ENDPOINT
      }
    });
  });

}