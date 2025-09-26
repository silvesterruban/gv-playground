import { Router } from 'express';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

// Test endpoint for public access
router.get('/public', (req, res) => {
  res.json({
    message: 'This is a public endpoint',
    authenticated: false,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for any authenticated user
router.get('/protected',
  AuthMiddleware.authenticateToken,
  (req, res) => {
    res.json({
      message: 'This is a protected endpoint',
      authenticated: true,
      user: req.user,
      timestamp: new Date().toISOString()
    });
  }
);

// Test endpoint for students only
router.get('/student-only',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireStudent,
  (req, res) => {
    res.json({
      message: 'This endpoint is for students only',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  }
);

// Test endpoint for verified students only
router.get('/verified-student',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireVerifiedStudent,
  (req, res) => {
    res.json({
      message: 'This endpoint is for verified students only',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  }
);

// Test endpoint for admins only
router.get('/admin-only',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireAdmin,
  (req, res) => {
    res.json({
      message: 'This endpoint is for admins only',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  }
);

// Test endpoint for super admins only
router.get('/super-admin-only',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireAdminRole(['super_admin']),
  (req, res) => {
    res.json({
      message: 'This endpoint is for super admins only',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  }
);

// Test endpoint with optional authentication
router.get('/optional-auth',
  AuthMiddleware.optionalAuth,
  (req, res) => {
    res.json({
      message: 'This endpoint has optional authentication',
      authenticated: !!req.user,
      user: req.user || null,
      timestamp: new Date().toISOString()
    });
  }
);

export default router;
