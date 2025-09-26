import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { ValidationMiddleware } from '../middleware/validation';
import { AuthMiddleware } from '../middleware/auth';
import { DonorController } from '../controllers/donorController';
// import { ValidationMiddleware } from '../middleware/validation';
import { body, validationResult } from 'express-validator';

const router = Router();

// Public routes (no authentication required)

// Student registration
router.post('/register/student',
  ValidationMiddleware.validateStudentRegistration(),
  ValidationMiddleware.checkValidation,
  AuthController.registerStudent
);

// Login (students and admins)
router.post('/login',
  ValidationMiddleware.validateLogin(),
  ValidationMiddleware.checkValidation,
  AuthController.login
);

// Email verification
router.post('/verify-email', AuthController.verifyEmail);

// OTP verification
router.post('/verify-otp', AuthController.verifyOtp);

// Forgot password
router.post('/forgot-password',
  ValidationMiddleware.validateForgotPassword(),
  ValidationMiddleware.checkValidation,
  AuthController.forgotPassword
);

// Reset password
router.post('/reset-password',
  ValidationMiddleware.validatePasswordReset(),
  ValidationMiddleware.checkValidation,
  AuthController.resetPassword
);

// Refresh token
router.post('/refresh-token',
  ValidationMiddleware.validateRefreshToken(),
  ValidationMiddleware.checkValidation,
  AuthController.refreshToken
);

// Resend verification email
router.post('/resend-verification',
  [
    ValidationMiddleware.validateEmail(),
    ValidationMiddleware.validateUserType()
  ],
  ValidationMiddleware.checkValidation,
  AuthController.resendVerification
);

// Complete student registration after payment
router.post('/complete-registration', AuthController.completeRegistration);

// Protected routes (authentication required)

// Get current user info
router.get('/me',
  AuthMiddleware.authenticateToken,
  AuthController.getCurrentUser
);

// Logout
router.post('/logout',
  AuthMiddleware.authenticateToken,
  AuthController.logout
);

// Admin-only routes

// Admin registration (super admin only)
router.post('/register/admin',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireAdminRole(['super_admin']),
  ValidationMiddleware.validateAdminRegistration(),
  ValidationMiddleware.checkValidation,
  AuthController.registerAdmin
);

router.post(
     '/register/donor',
     ValidationMiddleware.validateDonorRegistration(),
     ValidationMiddleware.checkValidation,
     DonorController.registerDonor
);

// Admin login route (separate from regular login)
router.post('/login/admin',
  [
    ValidationMiddleware.validateEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ],
  ValidationMiddleware.checkValidation,
  AuthController.loginAdmin  // You'll need to create this method
);

export default router;
export const authenticateToken = AuthMiddleware.authenticateToken;
export const requireAdmin = AuthMiddleware.requireAdmin;

