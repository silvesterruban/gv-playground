import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Helper function to check current rate limiting status dynamically
const checkRateLimitStatus = () => {
  const isTestMode = process.env.NODE_ENV === 'test';
  const isRateLimitDisabled = process.env.DISABLE_RATE_LIMIT === 'true';
  
  return {
    isTestMode,
    isRateLimitDisabled,
    isActive: !isTestMode && !isRateLimitDisabled
  };
};

// Helper function to create rate limiters that can be disabled in test mode
const createRateLimiter = (config: any) => {
  return (req: Request, res: Response, next: any) => {
    const status = checkRateLimitStatus();
    
    if (status.isTestMode || status.isRateLimitDisabled) {
      // In test mode or when manually disabled, return a no-op middleware that just calls next()
      const mode = status.isTestMode ? 'TEST MODE' : 'MANUALLY DISABLED';
      console.log(`🧪 [${mode}] Rate limiting disabled for:`, req.path);
      next();
      return;
    }
    
    // Apply rate limiting
    return rateLimit(config)(req, res, next);
  };
};

// Function to manually toggle rate limiting (useful for testing)
export const toggleRateLimiting = (enabled: boolean) => {
  if (enabled) {
    console.log('🔒 Rate limiting ENABLED');
    process.env.DISABLE_RATE_LIMIT = 'false';
  } else {
    console.log('🔓 Rate limiting DISABLED');
    process.env.DISABLE_RATE_LIMIT = 'true';
  }
};

// Function to check current rate limiting status
export const getRateLimitStatus = () => {
  const status = checkRateLimitStatus();
  return {
    isTestMode: status.isTestMode,
    isManuallyDisabled: status.isRateLimitDisabled,
    isActive: status.isActive,
    environment: process.env.NODE_ENV,
    disableFlag: process.env.DISABLE_RATE_LIMIT
  };
};

// General API rate limiter
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Stricter limiter for authentication endpoints
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Donation endpoint limiter
export const donationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 donation attempts per hour
  message: {
    success: false,
    message: 'Too many donation attempts, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many donation attempts, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// File upload limiter
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many file uploads, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// Admin endpoint limiter
export const adminLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Temporarily increased from 50 to 1000 for testing
  message: {
    success: false,
    message: 'Too many admin requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many admin requests, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Public donation limiter (stricter)
export const publicDonationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 public donations per hour
  message: {
    success: false,
    message: 'Too many public donations, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many public donations, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// Email verification limiter
export const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 email verification requests per hour
  message: {
    success: false,
    message: 'Too many email verification requests, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many email verification requests, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// Password reset limiter
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset requests, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset requests, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// Dynamic rate limiter based on user type
export const dynamicLimiter = (userType: 'student' | 'donor' | 'admin') => {
  const limits = {
    student: { windowMs: 15 * 60 * 1000, max: 200 },
    donor: { windowMs: 15 * 60 * 1000, max: 150 },
    admin: { windowMs: 15 * 60 * 1000, max: 500 }
  };

  const config = limits[userType] || limits.student;

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      message: `Too many requests for ${userType} account, please try again later.`,
      retryAfter: `${Math.floor(config.windowMs / 60000)} minutes`
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: `Too many requests for ${userType} account, please try again later.`,
        retryAfter: `${Math.floor(config.windowMs / 60000)} minutes`
      });
    }
  });
};

// IP-based blocking for suspicious activity
export const suspiciousActivityLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Very strict limit
  message: {
    success: false,
    message: 'Suspicious activity detected, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    // Log suspicious activity
    console.warn(`Suspicious activity detected from IP: ${req.ip}`);
    
    res.status(429).json({
      success: false,
      message: 'Suspicious activity detected, please try again later.',
      retryAfter: '5 minutes'
    });
  }
}); 