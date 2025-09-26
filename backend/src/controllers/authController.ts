// import { Request, Response } from 'express';
// import { AuthService } from '../services/authService';
// import {
//   LoginRequest,
//   StudentRegisterRequest,
//   AdminRegisterRequest,
//   ForgotPasswordRequest,
//   ResetPasswordRequest,
//   VerifyEmailRequest,
//   RefreshTokenRequest
// } from '../types/auth';
//
// export class AuthController {
//   // Student registration
//   static async registerStudent(req: Request, res: Response): Promise<void> {
//     try {
//       const data: StudentRegisterRequest = req.body;
//       const result = await AuthService.registerStudent(data);
//
//       const statusCode = result.success ? 201 : 400;
//       res.status(statusCode).json(result);
//     } catch (error) {
//       console.error('Student registration controller error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error'
//       });
//     }
//   }
//
//   // Admin registration (protected route)
//   static async registerAdmin(req: Request, res: Response): Promise<void> {
//     try {
//       const data: AdminRegisterRequest = req.body;
//       const result = await AuthService.registerAdmin(data);
//
//       const statusCode = result.success ? 201 : 400;
//       res.status(statusCode).json(result);
//     } catch (error) {
//       console.error('Admin registration controller error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error'
//       });
//     }
//   }
//
//   // Login
//   static async login(req: Request, res: Response): Promise<void> {
//     try {
//       const data: LoginRequest = req.body;
//       const result = await AuthService.login(data);
//
//       const statusCode = result.success ? 200 : 401;
//       res.status(statusCode).json(result);
//     } catch (error) {
//       console.error('Login controller error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error'
//       });
//     }
//   }
//
//   // Email verification
//   static async verifyEmail(req: Request, res: Response): Promise<void> {
//     try {
//       const data: VerifyEmailRequest = req.body;
//       const result = await AuthService.verifyEmail(data);
//
//       const statusCode = result.success ? 200 : 400;
//       res.status(statusCode).json(result);
//     } catch (error) {
//       console.error('Email verification controller error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error'
//       });
//     }
//   }
//
//   // Forgot password
//   static async forgotPassword(req: Request, res: Response): Promise<void> {
//     try {
//       const data: ForgotPasswordRequest = req.body;
//       const result = await AuthService.forgotPassword(data);
//
//       res.status(200).json(result); // Always 200 for security
//     } catch (error) {
//       console.error('Forgot password controller error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error'
//       });
//     }
//   }
//
//   // Reset password
//   static async resetPassword(req: Request, res: Response): Promise<void> {
//     try {
//       const data: ResetPasswordRequest = req.body;
//       const result = await AuthService.resetPassword(data);
//
//       const statusCode = result.success ? 200 : 400;
//       res.status(statusCode).json(result);
//     } catch (error) {
//       console.error('Reset password controller error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error'
//       });
//     }
//   }
//
//   // Refresh token
//   static async refreshToken(req: Request, res: Response): Promise<void> {
//     try {
//       const data: RefreshTokenRequest = req.body;
//       const result = await AuthService.refreshToken(data);
//
//       const statusCode = result.success ? 200 : 401;
//       res.status(statusCode).json(result);
//     } catch (error) {
//       console.error('Refresh token controller error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error'
//       });
//     }
//   }
//
//   // Get current user info
//   static async getCurrentUser(req: Request, res: Response): Promise<void> {
//     try {
//       // User info is already attached by middleware
//       if (!req.user) {
//         res.status(401).json({
//           success: false,
//           message: 'Not authenticated'
//         });
//         return;
//       }
//
//       res.status(200).json({
//         success: true,
//         user: {
//           id: req.user.userId,
//           email: req.user.email,
//           userType: req.user.userType,
//           verified: req.user.verified,
//           role: req.user.role
//         }
//       });
//     } catch (error) {
//       console.error('Get current user controller error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error'
//       });
//     }
//   }
//
//   // Logout (client-side token removal, but we can blacklist if needed)
//   static async logout(req: Request, res: Response): Promise<void> {
//     try {
//       // For now, logout is handled client-side by removing tokens
//       // In the future, we could implement token blacklisting
//
//       res.status(200).json({
//         success: true,
//         message: 'Logged out successfully'
//       });
//     } catch (error) {
//       console.error('Logout controller error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error'
//       });
//     }
//   }
//
//   // Resend verification email
//   static async resendVerification(req: Request, res: Response): Promise<void> {
//     try {
//       const { email, userType } = req.body;
//
//       if (userType === 'student') {
//         const student = await AuthService.resendStudentVerification(email);
//         res.status(200).json(student);
//       } else {
//         res.status(400).json({
//           success: false,
//           message: 'Invalid user type for verification'
//         });
//       }
//     } catch (error) {
//       console.error('Resend verification controller error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error'
//       });
//     }
//   }
// }


import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import {
  LoginRequest,
  StudentRegisterRequest,
  AdminRegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  RefreshTokenRequest
} from '../types/auth';

export class AuthController {
  // Student registration
  static async registerStudent(req: Request, res: Response): Promise<void> {
    try {
      const data: StudentRegisterRequest = req.body;
      const result = await AuthService.registerStudent(data);

      const statusCode = result.success ? 201 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('Student registration controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Admin registration (protected route)
  static async registerAdmin(req: Request, res: Response): Promise<void> {
    try {
      const data: AdminRegisterRequest = req.body;
      const result = await AuthService.registerAdmin(data);

      const statusCode = result.success ? 201 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('Admin registration controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Login
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const data: LoginRequest = req.body;
      const result = await AuthService.login(data);

      const statusCode = result.success ? 200 : 401;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('Login controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Email verification
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const data: VerifyEmailRequest = req.body;
      const result = await AuthService.verifyEmail(data);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('Email verification controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Forgot password
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const data: ForgotPasswordRequest = req.body;
      const result = await AuthService.forgotPassword(data);

      res.status(200).json(result); // Always 200 for security
    } catch (error) {
      console.error('Forgot password controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Reset password
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const data: ResetPasswordRequest = req.body;
      const result = await AuthService.resetPassword(data);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('Reset password controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Refresh token
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const data: RefreshTokenRequest = req.body;
      const result = await AuthService.refreshToken(data);

      const statusCode = result.success ? 200 : 401;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('Refresh token controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get current user info - FIXED VERSION
//   static async getCurrentUser(req: Request, res: Response): Promise<void> {
//     try {
//       // User info is already attached by middleware
//       if (!req.user) {
//         res.status(401).json({
//           success: false,
//           message: 'Not authenticated'
//         });
//         return;
//       }
//
//       // Create user response with conditional role property
//       const userResponse = {
//         id: req.user.userId,
//         email: req.user.email,
//         userType: req.user.userType,
//         verified: req.user.verified,
//         // Only include role if it exists (for admin users)
//         ...(req.user.role && { role: req.user.role })
//       };
//
//       res.status(200).json({
//         success: true,
//         user: userResponse
//       });
//     } catch (error) {
//       console.error('Get current user controller error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error'
//       });
//     }
//   }

  // Replace the getCurrentUser method in your authController.ts with this FIXED version:

  // Get current user info - FIXED VERSION
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // User info is already attached by middleware
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      // FIXED: Use 'id' consistently, not 'userId'
      const userResponse = {
        id: req.user.id,  // Changed from req.user.userId to req.user.id
        email: req.user.email,
        userType: req.user.userType,
        verified: req.user.verified,
        // Only include role if it exists (for admin users)
        ...(req.user.role && { role: req.user.role })
      };

      res.status(200).json({
        success: true,
        user: userResponse
      });
    } catch (error) {
      console.error('Get current user controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Logout (client-side token removal, but we can blacklist if needed)
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // For now, logout is handled client-side by removing tokens
      // In the future, we could implement token blacklisting

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Resend verification email
  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 Debug: Resend verification request received');
      console.log('🔍 Debug: Request body:', req.body);
      
      const { email, userType } = req.body;
      console.log('🔍 Debug: Extracted data:', { email, userType });

      if (userType === 'student') {
        console.log('🔍 Debug: Processing student verification resend');
        const student = await AuthService.resendStudentVerification(email);
        console.log('🔍 Debug: AuthService response:', student);
        res.status(200).json(student);
      } else {
        console.log('❌ Debug: Invalid user type:', userType);
        res.status(400).json({
          success: false,
          message: 'Invalid user type for verification'
        });
      }
    } catch (error) {
      console.error('❌ Debug: Resend verification controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Complete student registration after payment
  static async completeRegistration(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 Debug: Complete registration request received');
      console.log('🔍 Debug: Request body:', req.body);
      
      const { registrationData } = req.body;
      
      if (!registrationData) {
        res.status(400).json({
          success: false,
          message: 'Registration data is required'
        });
        return;
      }

      const result = await AuthService.completeStudentRegistration(registrationData);
      console.log('🔍 Debug: Complete registration result:', result);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('❌ Debug: Complete registration controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Admin login method - add this to your AuthController class
  static async loginAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Create login request with admin userType
      const data: LoginRequest = {
        email,
        password,
        userType: 'admin'
      };

      const result = await AuthService.login(data);

      const statusCode = result.success ? 200 : 401;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('Admin login controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // OTP verification
  static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 Debug: OTP verification controller called');
      console.log('🔍 Debug: Request body:', req.body);
      
      const { email, otp, userType } = req.body;
      
      if (!email || !otp || !userType) {
        res.status(400).json({
          success: false,
          message: 'Email, OTP, and userType are required'
        });
        return;
      }

      const result = await AuthService.verifyOtp(email, otp, userType);
      console.log('🔍 Debug: OTP verification result:', result);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('❌ Debug: OTP verification controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}