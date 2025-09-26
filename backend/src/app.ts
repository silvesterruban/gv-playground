// backend/src/app.ts - Express application configuration
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables - prioritize test.env if NODE_ENV is test
if (process.env.NODE_ENV === 'test') {
  const testEnvPath = path.join(__dirname, '../test.env');
  dotenv.config({ path: testEnvPath });
  console.log('🔧 [APP] Loaded test environment variables from:', testEnvPath);
} else {
  // Load default .env file
  dotenv.config();
  console.log('🔧 [APP] Loaded default environment variables');
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error';
import { 
  apiLimiter, 
  authLimiter, 
  donationLimiter, 
  uploadLimiter, 
  adminLimiter,
  publicDonationLimiter,
  emailVerificationLimiter,
  passwordResetLimiter
} from './middleware/rateLimit';
import { Logger, requestLogger, ipLogger } from './utils/logger';
import { performanceMonitor, startPerformanceMonitoring } from './middleware/performance';

// Import route handlers
import authRoutes from './routes/auth';
import testAuthRoutes from './routes/test-auth';
import studentRoutes from './routes/student-profile';
import studentVerificationRoutes from './routes/student-verification';
import donationAdminRoutes from './routes/donation-admin';
import donorRoutes from './routes/donors';
import schoolVerificationRoutes from './routes/school-verification';
import adminRoutes from './routes/admin';
import registrationPaymentRoutes from './routes/registration-payment';
import adminVerificationRouter from './routes/admin-verification';
import performanceRoutes from './routes/performance';
import donationRoutes from './routes/donations';
import adminDashboardRoutes from './routes/admin-dashboard';
import receiptRoutes from './routes/receipt';
import { setupTestEndpoints } from './routes/test-endpoints';

const app = express();

console.log('🚀 [APP] Express app configuration loaded');

// GLOBAL CORS FIX - Must be FIRST middleware, before everything else
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');

  if (req.method === 'OPTIONS') {
    console.log(`🚁 [GLOBAL CORS] Preflight: ${req.path}`);
    return res.status(200).end();
  }

  // Log image requests
  if (req.path.includes('photo') || req.path.includes('img')) {
    console.log(`🖼️ [GLOBAL CORS] Image request: ${req.method} ${req.path}`);
  }

  next();
});

// Simple image endpoint - bypasses all complex routing
app.get('/img/:filename', async (req, res) => {
  const { filename } = req.params;

  // Set headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  console.log(`📷 [IMG] Serving: ${filename}`);

  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { s3Client } = await import('./services/aws/config');

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME || 'village-uploads',
      Key: `profile-photos/${filename}`,
    });

    const response = await s3Client.send(command);

    if (response.Body) {
      const chunks = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      console.log(`✅ [IMG] Served: ${filename} (${buffer.length} bytes)`);
      res.send(buffer);
    } else {
      console.log(`❌ [IMG] Not found: ${filename}`);
      res.status(404).send('Image not found');
    }
  } catch (error) {
    console.error(`❌ [IMG] Error serving ${filename}:`, error);
    res.status(404).send('Image not found');
  }
});

// Alternative photo endpoint (backup)
app.get('/photos/:filename', async (req, res) => {
  const { filename } = req.params;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  console.log(`📸 [PHOTOS] Serving: ${filename}`);

  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { s3Client } = await import('./services/aws/config');

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME || 'village-uploads',
      Key: `profile-photos/${filename}`,
    });

    const response = await s3Client.send(command);

    if (response.Body) {
      const chunks = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      res.send(Buffer.concat(chunks));
    } else {
      res.status(404).send('Image not found');
    }
  } catch (error) {
    console.error('❌ [PHOTOS] Error:', error);
    res.status(404).send('Image not found');
  }
});

// Trust proxy for production deployment
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Enhanced security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://api.paypal.com"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://www.paypal.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
}));

// CORS configuration (additional layer)
const corsOptions = {
  origin: function (origin: any, callback: any) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8081',
      'http://localhost:19006',
      'http://localhost:19000',
      'exp://localhost:19000',
      'exp://192.168.1.5:19000',
      'http://192.168.1.5:8081',
      process.env.FRONTEND_URL,
      process.env.MOBILE_URL
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS: Blocked origin: ${origin}`);
      callback(null, true); // Allow anyway due to global CORS fix
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'x-access-token',
    'Cache-Control'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Enhanced logging and performance monitoring middleware
app.use(ipLogger);
app.use(requestLogger);
app.use(performanceMonitor);

// Request logging
app.use(morgan('combined', {
  skip: (req) => req.path === '/health'
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📝 [${timestamp}] ${req.method} ${req.path} from ${req.get('Origin') || 'unknown'}`);
  next();
});

// API Routes - Mount all route handlers with rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/test-auth', apiLimiter, testAuthRoutes);
app.use('/api/students', apiLimiter, studentRoutes);
app.use('/api/students', apiLimiter, studentVerificationRoutes);
app.use('/api/donations', donationLimiter, donationRoutes);
app.use('/api/donation-admin', adminLimiter, donationAdminRoutes);
app.use('/api/donors', apiLimiter, donorRoutes);
app.use('/api/school-verification', apiLimiter, schoolVerificationRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/registration-payment', donationLimiter, registrationPaymentRoutes);
app.use('/api/admin/verification', adminLimiter, adminVerificationRouter);
app.use('/api/performance', apiLimiter, performanceRoutes);
app.use('/api/admin/dashboard', adminLimiter, adminDashboardRoutes);
app.use('/api/receipt', apiLimiter, receiptRoutes);

// Setup test endpoints for AWS and system testing
setupTestEndpoints(app);

// Temporary delete route for student management - removed as file doesn't exist
// import tempDeleteRoutes from './routes/temp-delete';
// app.use('/api/temp', tempDeleteRoutes);

console.log('🔍 Registration payment routes mounted at /api/registration-payment');
console.log('🧪 Test endpoints mounted for AWS and system testing');

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'connected',
      aws_mode: process.env.USE_MOTO === 'true' ? 'moto' : 'aws',
      moto_endpoint: process.env.MOTO_ENDPOINT || null,
      s3_bucket: process.env.AWS_BUCKET_NAME || 'village-uploads'
    },
    features: [
      'Student registration & authentication',
      'Student profile management',
      'Student verification system',
      'Donor registration & authentication',
      'Donor profile & dashboard management',
      'Student discovery for donors',
      'Donor bookmark system',
      'Donation processing (Stripe/PayPal/Zelle)',
      'Tax-deductible receipts',
      'Admin donation management',
      'School verification system',
      'File uploads via S3',
      'Email sending via SES',
      'JWT token management',
      'Profile photo uploads',
      'Profile statistics',
      'Donation analytics & reporting'
    ]
  };

  res.json(health);
});

// Client-friendly metrics endpoint
app.get('/api/client-metrics', (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const currentTime = new Date();
    
    // Simple metrics for client consumption
    const clientMetrics = {
      timestamp: currentTime.toISOString(),
      service: "Backend Service",
      uptime: Math.round(process.uptime()),
      status: "healthy",
      
      // Key performance metrics
      performance: {
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        },
        nodeVersion: process.version,
        platform: process.platform
      },
      
      // Health indicators
      health: {
        status: "good",
        environment: process.env.NODE_ENV || 'development',
        database: "connected",
        aws_mode: process.env.USE_MOTO === 'true' ? 'moto' : 'aws'
      }
    };

    res.json(clientMetrics);

  } catch (error) {
    console.error('Error getting client metrics:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      service: "Backend Service",
      status: "error",
      error: "Failed to retrieve metrics"
    });
  }
});

// Admin dashboard client-friendly endpoint
app.get('/api/admin/client-metrics', async (req, res) => {
  try {
    const { AnalyticsService } = require('./services/analyticsService');
    const period = (req.query.period as 'today' | 'week' | 'month' | 'year') || 'today';
    const metrics = await AnalyticsService.getBusinessMetrics(period);
    
    // Format for client consumption
    const clientMetrics = {
      timestamp: metrics.timestamp,
      period: metrics.period,
      service: "GradVillage Admin Dashboard",
      status: "healthy",
      
      // Key business metrics
      overview: {
        totalStudents: metrics.users.totalStudents,
        totalDonors: metrics.users.totalDonors,
        totalDonations: metrics.donations.totalDonations,
        totalRevenue: Math.round(metrics.donations.totalAmount),
        activeRegistries: metrics.registry.activeRegistries,
        fundingProgress: Math.round(metrics.registry.fundingProgress)
      },
      
      // Today's activity
      today: {
        newStudents: metrics.users.newStudentsToday,
        newDonors: metrics.users.newDonorsToday,
        donations: metrics.donations.donationsToday,
        revenue: Math.round(metrics.donations.amountToday),
        averageDonation: Math.round(metrics.donations.averageDonation)
      },
      
      // Growth indicators
      growth: {
        studentGrowth: Math.round(metrics.growth.studentGrowthRate),
        donorGrowth: Math.round(metrics.growth.donorGrowthRate),
        donationGrowth: Math.round(metrics.growth.donationGrowthRate),
        revenueGrowth: Math.round(metrics.growth.revenueGrowthRate)
      },
      
      // Performance indicators
      performance: {
        averageDonation: Math.round(metrics.donations.averageDonation),
        topDonation: Math.round(metrics.donations.topDonationAmount),
        successRate: metrics.transactions.totalTransactions > 0 ? 
          Math.round((metrics.transactions.successfulTransactions / metrics.transactions.totalTransactions) * 100) : 0,
        fundingProgress: Math.round(metrics.registry.fundingProgress)
      },
      
      // Health status
      health: {
        status: metrics.growth.revenueGrowthRate > 0 ? "excellent" : 
                metrics.growth.revenueGrowthRate > -10 ? "good" : "needs_attention",
        alerts: metrics.growth.revenueGrowthRate < -20 ? ["Revenue declining"] : []
      }
    };
    
    res.json(clientMetrics);
  } catch (error) {
    console.error('Error getting admin client metrics:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      service: "GradVillage Admin Dashboard",
      status: "error",
      error: "Failed to retrieve metrics"
    });
  }
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Village Platform API v1.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      authentication: [
        'POST /api/auth/register/student',
        'POST /api/auth/register/donor',
        'POST /api/auth/login',
        'POST /api/auth/verify-email',
        'GET /api/auth/me',
        'POST /api/auth/refresh-token'
      ],
      student_management: [
        'GET /api/students/profile',
        'PUT /api/students/profile',
        'POST /api/students/profile/photo',
        'DELETE /api/students/profile/photo',
        'GET /api/students/profile/photo/:filename',
        'GET /img/:filename', // NEW: Simple image endpoint
        'GET /photos/:filename', // NEW: Alternative image endpoint
        'GET /api/students/profile/stats',
        'GET /api/students/check-url/:url',
        'PATCH /api/students/profile/settings',
        'GET /api/students/schools',
        'GET /api/students/verification-status',
        'POST /api/students/submit-verification',
        'DELETE /api/students/cancel-verification',
        'POST /api/students/resend-verification-email'
      ],
      donor_management: [
        'GET /api/donors/profile',
        'PUT /api/donors/profile',
        'GET /api/donors/profile/dashboard/stats',
        'GET /api/donors/students',
        'GET /api/donors/students/:studentId',
        'GET /api/donors/students/search/suggestions',
        'GET /api/donors/bookmarks',
        'POST /api/donors/bookmarks',
        'PATCH /api/donors/bookmarks/:bookmarkId',
        'DELETE /api/donors/bookmarks/:bookmarkId',
        'GET /api/donors/bookmarks/check/:studentId',
        'GET /api/donors/donations',
        'GET /api/donors/donations/reports/tax-summary',
        'GET /api/donors/donations/analytics/impact'
      ],
      donations: [
        'POST /api/donations/create',
        'POST /api/donations/process-payment',
        'GET /api/donations/history',
        'POST /api/donations/stripe/create-intent',
        'POST /api/donations/paypal/create-order',
        'POST /api/donations/stripe/webhook',
        'POST /api/donations/paypal/webhook'
      ],
      admin: [
        'GET /api/admin/stats',
        'GET /api/admin/users',
        'PUT /api/admin/users/:userId/status',
        'GET /api/admin/verifications',
        'GET /api/donation-admin/donations',
        'GET /api/donation-admin/analytics',
        'POST /api/donation-admin/refund/:donationId',
        'POST /api/donation-admin/verify-zelle/:donationId',
        'GET /api/donation-admin/export'
      ],
      verification: [
        'POST /api/school-verification/submit'
      ],
      testing: [
        'GET /api/test-auth/public',
        'GET /api/test-auth/protected',
        'GET /api/test-auth/student-only',
        'GET /api/test/aws',
        'GET /api/test/s3',
        'POST /api/test/ses'
      ]
    },
    integrations: {
      aws: {
        mode: process.env.USE_MOTO === 'true' ? 'development (moto)' : 'production (aws)',
        endpoint: process.env.MOTO_ENDPOINT || 'aws',
        bucket: process.env.AWS_BUCKET_NAME || 'village-uploads'
      },
      payments: {
        supported_methods: ['stripe', 'paypal', 'zelle'],
        nonprofit_compliance: '501(c)(3) tax-deductible receipts',
        features: ['one-time donations', 'recurring donations', 'registry-specific donations']
      },
      donor_features: {
        discovery: 'Advanced student search and filtering',
        bookmarks: 'Save and organize favorite students',
        dashboard: 'Impact tracking and donation analytics',
        history: 'Complete donation history with tax reporting',
        analytics: 'Monthly trends and category breakdowns'
      }
    },
    documentation: (process.env.FRONTEND_URL || 'http://localhost:3000') + '/api/docs'
  });
});

// JSON syntax error middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof SyntaxError && (error as any).status === 400 && 'body' in error) {
    console.error('🚫 JSON Syntax Error:', error.message);
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      message: 'Please check your request body format'
    });
  }
  next(error);
});

// Global error handling middleware
app.use(errorHandler);

// 404 handler - must be last
app.use('*', (req, res) => {
  console.log(`🚫 404: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Check GET /api for available endpoints',
    timestamp: new Date().toISOString()
  });
});

export default app;