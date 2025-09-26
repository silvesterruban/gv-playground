// backend/src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult, ValidationChain } from 'express-validator';

export class ValidationMiddleware {
  // Check validation results
  static checkValidation(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: 'path' in error ? error.path : 'unknown',
          message: error.msg,
          value: 'value' in error ? error.value : undefined
        }))
      });
      return;
    }

    next();
  }

  // Email validation
  static validateEmail(): ValidationChain {
    return body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address');
  }

  // Password validation
  static validatePassword(): ValidationChain {
    return body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
  }

  // Name validation
  static validateName(field: string): ValidationChain {
    return body(field)
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage(`${field} must be between 2 and 50 characters`)
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage(`${field} can only contain letters, spaces, hyphens, and apostrophes`);
  }

  // School validation
  static validateSchool(): ValidationChain {
    return body('school')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('School name must be between 2 and 100 characters');
  }

  // User type validation (updated to include donor)
  static validateUserType(): ValidationChain {
    return body('userType')
      .isIn(['student', 'admin', 'donor'])
      .withMessage('User type must be either "student", "admin", or "donor"');
  }

  // Admin role validation
  static validateAdminRole(): ValidationChain {
    return body('role')
      .isIn(['super_admin', 'moderator', 'support'])
      .withMessage('Admin role must be one of: super_admin, moderator, support');
  }

  // Student registration validation
  static validateStudentRegistration(): ValidationChain[] {
    return [
      this.validateEmail(),
      this.validatePassword(),
      this.validateName('firstName'),
      this.validateName('lastName'),
      this.validateSchool(),
      body('major')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Major must be less than 100 characters')
    ];
  }

  // Admin registration validation
  static validateAdminRegistration(): ValidationChain[] {
    return [
      this.validateEmail(),
      this.validatePassword(),
      this.validateName('firstName'),
      this.validateName('lastName'),
      this.validateAdminRole()
    ];
  }

  // Donor registration validation
  static validateDonorRegistration(): ValidationChain[] {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),

      body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
        .withMessage('Password must contain at least one uppercase letter, lowercase letter, number, and special character'),

      body('firstName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name must be between 1 and 50 characters'),

      body('lastName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name must be between 1 and 50 characters'),

      body('phone')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Phone number must be less than 20 characters'),

      body('address')
        .optional()
        .isObject()
        .withMessage('Address must be an object'),

      body('address.street')
        .if(body('address').exists())
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Street address must be between 1 and 100 characters'),

      body('address.city')
        .if(body('address').exists())
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('City must be between 1 and 50 characters'),

      body('address.state')
        .if(body('address').exists())
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('State must be between 1 and 50 characters'),

      body('address.zipCode')
        .if(body('address').exists())
        .trim()
        .isLength({ min: 1, max: 10 })
        .withMessage('Zip code must be between 1 and 10 characters'),

      body('address.country')
        .if(body('address').exists())
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Country must be between 1 and 50 characters')
    ];
  }

  // Login validation
  static validateLogin(): ValidationChain[] {
    return [
      this.validateEmail(),
      body('password')
        .notEmpty()
        .withMessage('Password is required'),
      this.validateUserType()
    ];
  }

  // Password reset validation
  static validatePasswordReset(): ValidationChain[] {
    return [
      body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
      this.validatePassword()
    ];
  }

  // Forgot password validation
  static validateForgotPassword(): ValidationChain[] {
    return [
      this.validateEmail(),
      this.validateUserType()
    ];
  }

  // Email verification validation
  static validateEmailVerification(): ValidationChain[] {
    return [
      body('token')
        .notEmpty()
        .withMessage('Verification token is required')
    ];
  }

  // Refresh token validation
  static validateRefreshToken(): ValidationChain[] {
    return [
      body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token is required')
    ];
  }

  // Donor profile update validation
  static validateDonorProfileUpdate(): ValidationChain[] {
    return [
      body('firstName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name must be between 1 and 50 characters'),

      body('lastName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name must be between 1 and 50 characters'),

      body('phone')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Phone number must be less than 20 characters'),

      body('address')
        .optional()
        .isObject()
        .withMessage('Address must be an object'),

      body('address.street')
        .if(body('address').exists())
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Street address must be between 1 and 100 characters'),

      body('address.city')
        .if(body('address').exists())
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('City must be between 1 and 50 characters'),

      body('address.state')
        .if(body('address').exists())
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('State must be between 1 and 50 characters'),

      body('address.zipCode')
        .if(body('address').exists())
        .trim()
        .isLength({ min: 1, max: 10 })
        .withMessage('Zip code must be between 1 and 10 characters'),

      body('address.country')
        .if(body('address').exists())
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Country must be between 1 and 50 characters'),

      body('preferences')
        .optional()
        .isObject()
        .withMessage('Preferences must be an object'),

      body('preferences.emailNotifications')
        .optional()
        .isBoolean()
        .withMessage('Email notifications must be a boolean'),

      body('preferences.publicProfile')
        .optional()
        .isBoolean()
        .withMessage('Public profile must be a boolean'),

      body('preferences.preferredDonationAmount')
        .optional()
        .isNumeric()
        .custom((value) => {
          if (value < 0) {
            throw new Error('Preferred donation amount must be positive');
          }
          return true;
        })
    ];
  }

  // Student discovery query validation
  static validateStudentDiscoveryQuery(): ValidationChain[] {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

      query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),

      query('search')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Search term must be less than 100 characters'),

      query('school')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('School filter must be less than 100 characters'),

      query('major')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Major filter must be less than 100 characters'),

      query('location')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Location filter must be less than 100 characters'),

      query('graduationYear')
        .optional()
        .trim()
        .isLength({ max: 4 })
        .withMessage('Graduation year must be 4 characters or less'),

      query('urgency')
        .optional()
        .isIn(['high', 'medium', 'low'])
        .withMessage('Urgency must be high, medium, or low'),

      query('fundingGoalMin')
        .optional()
        .isNumeric()
        .custom((value) => {
          if (value < 0) {
            throw new Error('Minimum funding goal must be positive');
          }
          return true;
        }),

      query('fundingGoalMax')
        .optional()
        .isNumeric()
        .custom((value) => {
          if (value < 0) {
            throw new Error('Maximum funding goal must be positive');
          }
          return true;
        }),

      query('sortBy')
        .optional()
        .isIn(['recent', 'name', 'goal-asc', 'goal-desc', 'progress'])
        .withMessage('Invalid sort option'),

      query('verified')
        .optional()
        .isBoolean()
        .withMessage('Verified filter must be a boolean')
    ];
  }

  // Create bookmark validation
  static validateCreateBookmark(): ValidationChain[] {
    return [
      body('studentId')
        .isUUID()
        .withMessage('Student ID must be a valid UUID'),

      body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes must be less than 500 characters')
    ];
  }

  // Update bookmark validation
  static validateUpdateBookmark(): ValidationChain[] {
    return [
      body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes must be less than 500 characters')
    ];
  }

  // Donation history query validation
  static validateDonationHistoryQuery(): ValidationChain[] {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

      query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),

      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO date'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO date'),

      query('studentId')
        .optional()
        .isUUID()
        .withMessage('Student ID must be a valid UUID'),

      query('donationType')
        .optional()
        .isIn(['general', 'item', 'emergency'])
        .withMessage('Donation type must be general, item, or emergency'),

      query('status')
        .optional()
        .isIn(['completed', 'pending', 'failed', 'refunded'])
        .withMessage('Status must be completed, pending, failed, or refunded'),

      query('recurring')
        .optional()
        .isBoolean()
        .withMessage('Recurring filter must be a boolean'),

      query('sortBy')
        .optional()
        .isIn(['date', 'amount', 'student'])
        .withMessage('Sort by must be date, amount, or student'),

      query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc')
    ];
  }

  // Recurring donation validation
  static validateRecurringDonation(): ValidationChain[] {
    return [
      body('studentId')
        .isUUID()
        .withMessage('Valid student ID is required'),
      body('amount')
        .isInt({ min: 100 }) // Minimum $1.00
        .withMessage('Amount must be at least $1.00'),
      body('frequency')
        .isIn(['weekly', 'monthly', 'quarterly', 'yearly'])
        .withMessage('Frequency must be weekly, monthly, quarterly, or yearly'),
      body('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid date')
    ];
  }

  // Item sponsorship validation
  static validateItemSponsorship(): ValidationChain[] {
    return [
      body('itemId')
        .isUUID()
        .withMessage('Valid item ID is required'),
      body('amount')
        .isInt({ min: 100 }) // Minimum $1.00
        .withMessage('Amount must be at least $1.00'),
      body('message')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Message must be less than 500 characters')
    ];
  }

  // Password reset request validation
  static validatePasswordResetRequest(): ValidationChain[] {
    return [
      body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
    ];
  }

  // Password reset confirm validation
  static validatePasswordResetConfirm(): ValidationChain[] {
    return [
      body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
      body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
        .withMessage('Password must contain at least one uppercase letter, lowercase letter, number, and special character')
    ];
  }

  // Account deletion validation
  static validateAccountDeletion(): ValidationChain[] {
    return [
      body('password')
        .notEmpty()
        .withMessage('Password is required to delete account')
    ];
  }

  // Notification preferences validation
  static validateNotificationPreferences(): ValidationChain[] {
    return [
      body('preferences')
        .isObject()
        .withMessage('Preferences must be an object'),
      body('preferences.emailNotifications')
        .optional()
        .isBoolean()
        .withMessage('Email notifications preference must be a boolean'),
      body('preferences.donationReminders')
        .optional()
        .isBoolean()
        .withMessage('Donation reminders preference must be a boolean'),
      body('preferences.studentUpdates')
        .optional()
        .isBoolean()
        .withMessage('Student updates preference must be a boolean')
    ];
  }

  // UUID parameter validation
  static validateUUIDParam(paramName: string): ValidationChain[] {
    return [
      param(paramName)
        .isUUID()
        .withMessage(`${paramName} must be a valid UUID`)
    ];
  }
}