// backend/src/middleware/auth.ts - FIXED VERSION
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { JWTUtils } from '../utils/jwt';
import { JWTPayload } from '../types/auth';

const prisma = new PrismaClient();

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    let user = null;

    // FIXED: Use consistent 'id' field
    if (decoded.userType === 'student') {
      user = await prisma.student.findUnique({ where: { id: decoded.id } });
    } else if (decoded.userType === 'admin') {
      user = await prisma.admin.findUnique({ where: { id: decoded.id } });
    } else if (decoded.userType === 'donor') {
      user = await prisma.donor.findUnique({ where: { id: decoded.id } });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // FIXED: Set consistent user object
    req.user = {
      id: user.id,  // Use 'id' consistently
      email: user.email,
      userType: decoded.userType,
      verified: user.verified,
      ...(decoded.userType === 'donor' && {
        firstName: user.firstName,
        lastName: user.lastName
      }),
      // Only include role for admin users
      ...(decoded.userType === 'admin' && (user as any).role && { role: (user as any).role })
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Add this to your backend/src/middleware/auth.ts file

// export const requireAdmin = async (req: any, res: any, next: any) => {
//   try {
//     if (!req.user) {
//       return res.status(401).json({
//         success: false,
//         error: 'Authentication required'
//       });
//     }
//
//     console.log('🔐 [RequireAdmin] Checking admin privileges...');
//     console.log('🔐 [RequireAdmin] User role:', req.user.role);
//     console.log('🔐 [RequireAdmin] User userType:', req.user.userType);
//
//     // Check if user has admin role
//     const isAdmin = req.user.role === 'super_admin' ||
//                    req.user.role === 'admin' ||
//                    req.user.userType === 'admin';
//
//     if (!isAdmin) {
//       console.log('❌ [RequireAdmin] Access denied - not admin');
//       return res.status(403).json({
//         success: false,
//         error: 'Admin access required'
//       });
//     }
//
//     console.log('✅ [RequireAdmin] Admin access granted');
//     next();
//   } catch (error) {
//     console.error('💥 [RequireAdmin] Error:', error);
//     return res.status(500).json({
//       success: false,
//       error: 'Server error during admin check'
//     });
//   }
// };

export class AuthMiddleware {
  // FIXED: Verify JWT token and attach user to request
  static authenticateToken(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    try {
      const decoded = JWTUtils.verifyToken(token);

     // FIXED: Set consistent user object with 'id' field
      req.user = {
        id: decoded.id,  // Use 'id' consistently, not 'userId'
        email: decoded.email,
        userType: decoded.userType,
        verified: decoded.verified,
        // Only include role if it exists in the decoded token (for admin users)
        ...(decoded.role && { role: decoded.role })
      };

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token verification failed';

      if (errorMessage === 'Token expired') {
        res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
    }
  }

  // Add this method to your existing AuthMiddleware class
  static requireUserType(requiredType: 'student' | 'donor' | 'admin') {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (req.user.userType !== requiredType) {
        return res.status(403).json({
          success: false,
          message: `Access denied. ${requiredType} role required.`
        });
      }

      next();
    };
  }

  // Require student role
  static requireStudent(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (req.user.userType !== 'student') {
      res.status(403).json({
        success: false,
        message: 'Student access required'
      });
      return;
    }

    next();
  }

  // Require admin role
//   static requireAdmin(req: Request, res: Response, next: NextFunction): void {
//     if (!req.user) {
//       res.status(401).json({
//         success: false,
//         message: 'Authentication required'
//       });
//       return;
//     }
//
//     if (req.user.userType !== 'admin') {
//       res.status(403).json({
//         success: false,
//         message: 'Admin access required'
//       });
//       return;
//     }
//
//     next();
//   }

// REPLACE WITH THIS:
static requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  // Check if user has admin role - SAME LOGIC AS STANDALONE FUNCTION
  const isAdmin = req.user.role === 'super_admin' ||
                 req.user.role === 'admin' ||
                 req.user.userType === 'admin';

  if (!isAdmin) {
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
    return;
  }

  next();
}

  // NEW: Require donor role
  static requireDonor(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (req.user.userType !== 'donor') {
      res.status(403).json({
        success: false,
        message: 'Donor access required'
      });
      return;
    }

    next();
  }

  // FIXED: Require specific admin role
  static requireAdminRole(roles: string[] = ['admin', 'super_admin']) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (req.user.userType !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
        return;
      }

      if (roles.length > 0 && !roles.includes(req.user.role || 'admin')) {
        res.status(403).json({
          success: false,
          message: `Required role: ${roles.join(' or ')}`
        });
        return;
      }

      next();
    };
  }

  // Require verified student
  static requireVerifiedStudent(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (req.user.userType !== 'student') {
      res.status(403).json({
        success: false,
        message: 'Student access required'
      });
      return;
    }

    if (!req.user.verified) {
      res.status(403).json({
        success: false,
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED'
      });
      return;
    }

    next();
  }

  // NEW: Require verified donor
  static requireVerifiedDonor(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (req.user.userType !== 'donor') {
      res.status(403).json({
        success: false,
        message: 'Donor access required'
      });
      return;
    }

    if (!req.user.verified) {
      res.status(403).json({
        success: false,
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED'
      });
      return;
    }

    next();
  }

  // Optional authentication (sets user if token is valid, but doesn't require it)
  static optionalAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    try {
      const decoded = JWTUtils.verifyToken(token);
      req.user = {
        id: decoded.id,  // Use 'id' consistently
        email: decoded.email,
        userType: decoded.userType,
        verified: decoded.verified,
        role: decoded.role || undefined
      };
    } catch (error) {
      // Ignore token errors for optional auth
    }

    next();
  }

  // FIXED: Check if user owns resource (for student-specific operations)
  static requireOwnership(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const resourceUserId = req.params.userId || req.params.studentId;

    if (req.user.userType === 'admin') {
      // Admins can access any resource
      next();
      return;
    }

    // FIXED: Use 'id' consistently
    if (req.user.id !== resourceUserId) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
      return;
    }

    next();
  }
}

// Export individual functions for compatibility with donation routes
export const authenticateToken = AuthMiddleware.authenticateToken;
export const requireAdmin = AuthMiddleware.requireAdmin;
export const requireStudent = AuthMiddleware.requireStudent;
export const requireVerifiedStudent = AuthMiddleware.requireVerifiedStudent;
export const optionalAuth = AuthMiddleware.optionalAuth;
export const requireOwnership = AuthMiddleware.requireOwnership;

// NEW: Export donor functions
export const requireDonor = AuthMiddleware.requireDonor;
export const requireVerifiedDonor = AuthMiddleware.requireVerifiedDonor;