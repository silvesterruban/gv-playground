// backend/src/routes/student-profile.ts
import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, param, validationResult } from 'express-validator';
import { AuthMiddleware } from '../middleware/auth';
import { s3Service } from '../services/aws/s3Service';
import multer from 'multer';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../services/aws/config';
import { Readable } from 'stream';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['jpg', 'jpeg', 'png'];
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();

    if (fileExtension && allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
  },
});

// Validation middleware
const validateProfile = [
  body('firstName')
    .optional({ nullable: true })
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name must be 1-50 characters'),

  body('lastName')
    .optional({ nullable: true })
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name must be 1-50 characters'),

  body('school')
    .optional({ checkFalsy: true, nullable: true })
    .isLength({ min: 0, max: 100 })
    .withMessage('School name must be 0-100 characters'),

  body('major')
    .optional({ checkFalsy: true, nullable: true })
    .isLength({ min: 0, max: 100 })
    .withMessage('Major must be 0-100 characters'),

  body('bio')
    .optional({ checkFalsy: true, nullable: true })
    .isLength({ max: 1000 })
    .withMessage('Bio must be less than 1000 characters'),

  body('fundingGoal')
    .optional({ checkFalsy: true, nullable: true })
    .isFloat({ min: 0, max: 50000 })
    .withMessage('Funding goal must be between $0 and $50,000'),

  body('profileUrl')
    .optional({ checkFalsy: true, nullable: true })
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Profile URL must contain only lowercase letters, numbers, and hyphens'),

  body('graduationYear')
    .optional({ checkFalsy: true, nullable: true })
    .isInt({ min: 2020, max: 2030 })
    .withMessage('Graduation year must be between 2020 and 2030'),

  body('gpa')
    .optional({ checkFalsy: true, nullable: true })
    .isFloat({ min: 0, max: 4.0 })
    .withMessage('GPA must be between 0.0 and 4.0'),

  body('phoneNumber')
    .optional({ checkFalsy: true, nullable: true })
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Invalid phone number format'),

  body('linkedinUrl')
    .optional({ checkFalsy: true, nullable: true })
    .isURL()
    .withMessage('Invalid LinkedIn URL'),

  body('achievements')
    .optional({ checkFalsy: true, nullable: true })
    .isLength({ max: 2000 })
    .withMessage('Achievements must be less than 2000 characters'),

  body('financialNeed')
    .optional({ checkFalsy: true, nullable: true })
    .isLength({ max: 2000 })
    .withMessage('Financial need description must be less than 2000 characters'),

  body('personalStatement')
    .optional({ checkFalsy: true, nullable: true })
    .isLength({ max: 3000 })
    .withMessage('Personal statement must be less than 3000 characters'),
];

// Validation for registry item
const validateRegistry = [
  body('itemName').optional().isLength({ min: 1, max: 100 }).withMessage('Item name is required (1-100 characters)'),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Item name is required (1-100 characters)'),
  body('price').isFloat({ min: 1, max: 5000 }).withMessage('Price must be between $1 and $5000'),
  body('category').isLength({ min: 1, max: 50 }).withMessage('Category is required'),
  body('priority').optional().isIn(['high', 'medium', 'low']).withMessage('Priority must be high, medium, or low'),
  body('itemDescription').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
];

// GET /api/students/profile - Get current student's profile
router.get('/profile',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireStudent,
  async (req: Request, res: Response) => {
    try {
      const student = await prisma.student.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          schoolName: true,
          major: true,
          bio: true,
          profilePhoto: true,
          registrationStatus: true,
          registrationPaid: true,
          fundingGoal: true,
          amountRaised: true,
          profileUrl: true,
          isActive: true,
          graduationYear: true,
          location: true,
          verified: true,
          createdAt: true,
          updatedAt: true,
          registries: {
            select: {
              id: true,
              itemName: true,
              price: true,
              category: true,
              priority: true,
              fundedStatus: true,
              amountFunded: true,
              itemDescription: true,
            },
          },
          donations: {
            where: {
              donationType: {
                not: 'registration_fee'
              },
              status: 'completed'
            },
            select: {
              id: true
            }
          },
          _count: {
            select: {
              registries: true,
            },
          },
        },
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found',
        });
      }

      // Calculate profile completion percentage
      const requiredFields = ['firstName', 'lastName', 'schoolName', 'major', 'bio', 'graduationYear'];
      const completedFields = requiredFields.filter(field => {
        const value = student[field as keyof typeof student];
        return value !== null && value !== undefined && value !== '';
      });
      const profileCompletion = Math.round((completedFields.length / requiredFields.length) * 100);

      // Format data to match frontend expectations
      const formattedProfile = {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        school: student.schoolName,
        major: student.major,
        bio: student.bio,
        profilePhoto: student.profilePhoto,
        fundingGoal: student.fundingGoal ? parseFloat(student.fundingGoal.toString()) : null,
        amountRaised: student.amountRaised ? parseFloat(student.amountRaised.toString()) : 0,
        profileUrl: student.profileUrl,
        graduationYear: student.graduationYear ? parseInt(student.graduationYear) : null,
        location: student.location,
        verified: student.verified,
        registrationStatus: student.registrationStatus,
        registrationPaid: student.registrationPaid,
        isActive: student.isActive,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
        profileCompletion,
        stats: {
          totalDonations: student.donations.length,
          totalRegistryItems: student._count.registries,
          fundingProgress: Number(student.fundingGoal) > 0
            ? Math.round((Number(student.amountRaised) / Number(student.fundingGoal)) * 100)
            : 0,
        },
      };

      res.json({
        success: true,
        profile: formattedProfile,
      });
    } catch (error) {
      console.error('Error fetching student profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
      });
    }
  }
);

// PUT /api/students/profile - Update current student's profile
router.put('/profile',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireStudent,
  validateProfile,
  async (req: Request, res: Response) => {
    // --- DEBUG STATEMENTS ---
    console.log('DEBUG: req.user:', req.user);
    console.log('DEBUG: Incoming profile update payload:', req.body);

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('DEBUG: Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    // --- END DEBUG STATEMENTS ---

    try {
      const {
        firstName,
        lastName,
        school,
        major,
        bio,
        fundingGoal,
        profileUrl,
        graduationYear,
        gpa,
        phoneNumber,
        linkedinUrl,
        achievements,
        financialNeed,
        personalStatement
      } = req.body;

      // Check if profileUrl is unique (if provided)
      if (profileUrl) {
        const existingStudent = await prisma.student.findFirst({
          where: {
            profileUrl,
            userId: { not: req.user!.id },
          },
        });

        if (existingStudent) {
          return res.status(400).json({
            success: false,
            message: 'Profile URL is already taken',
          });
        }
      }

      const updatedStudent = await prisma.student.update({
        where: { id: req.user!.id },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(school && { schoolName: school }),
          ...(major && { major }),
          ...(bio && { bio }),
          ...(fundingGoal !== undefined && { fundingGoal }),
          ...(profileUrl && { profileUrl }),
          ...(graduationYear && { graduationYear: graduationYear.toString() }),
          ...(gpa !== undefined && { gpa }),
          ...(phoneNumber && { phoneNumber }),
          ...(linkedinUrl && { linkedinUrl }),
          ...(achievements && { achievements }),
          ...(financialNeed && { financialNeed }),
          ...(personalStatement && { personalStatement }),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          schoolName: true,
          major: true,
          bio: true,
          profilePhoto: true,
          fundingGoal: true,
          amountRaised: true,
          profileUrl: true,
          graduationYear: true,
          updatedAt: true,
          gpa: true,
          achievements: true,
          financialNeed: true,
          phoneNumber: true,
          linkedinUrl: true,
          personalStatement: true,
        },
      });

      // Format response to match frontend expectations
      const formattedProfile = {
        id: updatedStudent.id,
        firstName: updatedStudent.firstName,
        lastName: updatedStudent.lastName,
        email: updatedStudent.email,
        school: updatedStudent.schoolName,
        major: updatedStudent.major,
        bio: updatedStudent.bio,
        profilePhoto: updatedStudent.profilePhoto,
        fundingGoal: updatedStudent.fundingGoal ? parseFloat(updatedStudent.fundingGoal.toString()) : null,
        amountRaised: updatedStudent.amountRaised ? parseFloat(updatedStudent.amountRaised.toString()) : 0,
        profileUrl: updatedStudent.profileUrl,
        graduationYear: updatedStudent.graduationYear ? parseInt(updatedStudent.graduationYear) : null,
        updatedAt: updatedStudent.updatedAt,
        gpa: updatedStudent.gpa ? parseFloat(updatedStudent.gpa.toString()) : null,
        achievements: updatedStudent.achievements,
        financialNeed: updatedStudent.financialNeed,
        phoneNumber: updatedStudent.phoneNumber,
        linkedinUrl: updatedStudent.linkedinUrl,
        personalStatement: updatedStudent.personalStatement,
      };

      res.json({
        success: true,
        message: 'Profile updated successfully',
        profile: formattedProfile,
      });
    } catch (error) {
      console.error('Error updating student profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
      });
    }
  }
);

// POST /api/students/profile/photo - Upload profile photo
router.post('/profile/photo',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireStudent,
  upload.single('photo'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No photo file provided',
        });
      }

      const fileName = `${req.user!.id}-profile-${Date.now()}.${req.file.originalname.split('.').pop()}`;
      const { key, url } = await s3Service.uploadFile(
        req.file.buffer,
        fileName,
        req.file.mimetype,
        'profile-photos'
      );

      const updatedStudent = await prisma.student.update({
        where: { id: req.user!.id },
        data: { profilePhoto: url },
        select: {
          id: true,
          profilePhoto: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        message: 'Profile photo updated successfully',
        data: {
          profilePhoto: updatedStudent.profilePhoto,
          uploadInfo: {
            key,
            url,
            originalName: req.file.originalname,
            size: req.file.size,
          },
        },
      });
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload profile photo',
      });
    }
  }
);

// DELETE /api/students/profile/photo - Remove profile photo
router.delete('/profile/photo',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireStudent,
  async (req: Request, res: Response) => {
    try {
      const student = await prisma.student.findUnique({
        where: { id: req.user!.id },
        select: { profilePhoto: true },
      });

      if (!student?.profilePhoto) {
        return res.status(400).json({
          success: false,
          message: 'No profile photo to remove',
        });
      }

      try {
        const urlParts = student.profilePhoto.split('/');
        const key = `profile-photos/${urlParts[urlParts.length - 1]}`;
        await s3Service.deleteFile(key);
      } catch (s3Error) {
        console.warn('Failed to delete file from S3:', s3Error);
      }

      await prisma.student.update({
        where: { id: req.user!.id },
        data: { profilePhoto: null },
      });

      res.json({
        success: true,
        message: 'Profile photo removed successfully',
      });
    } catch (error) {
      console.error('Error removing profile photo:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove profile photo',
      });
    }
  }
);

// GET /api/students/profile/stats - Get detailed profile statistics
router.get('/profile/stats',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireStudent,
  async (req: Request, res: Response) => {
    try {
      // First get the student to get their ID
      const currentStudent = await prisma.student.findUnique({
        where: { id: req.user!.id },
        select: { id: true }
      });

      if (!currentStudent) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }

      const [student, donations, registries] = await Promise.all([
        prisma.student.findUnique({
          where: { id: req.user!.id },
          select: {
            fundingGoal: true,
            amountRaised: true,
            createdAt: true,
          },
        }),
        prisma.donation.findMany({
          where: { studentId: currentStudent.id }, // Use correct student ID
          select: {
            amount: true,
            createdAt: true,
            status: true,
          },
        }),
        prisma.registry.findMany({
          where: { studentId: currentStudent.id }, // Use correct student ID
          select: {
            price: true,
            amountFunded: true,
            fundedStatus: true,
            category: true,
          },
        }),
      ]);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }

      // Calculate statistics
      const completedDonations = donations.filter(d => d.status === 'completed');
      const totalRaised = completedDonations.reduce((sum, d) => sum + Number(d.amount), 0);

      const registryStats = registries.reduce((acc, registry) => {
        acc.totalValue += Number(registry.price);
        acc.totalFunded += Number(registry.amountFunded);

        if (registry.fundedStatus === 'funded') {
          acc.fullyFundedItems++;
        }

        acc.byCategory[registry.category] = (acc.byCategory[registry.category] || 0) + 1;

        return acc;
      }, {
        totalValue: 0,
        totalFunded: 0,
        fullyFundedItems: 0,
        byCategory: {} as Record<string, number>,
      });

      // Monthly donation trends (last 12 months)
      const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthDonations = completedDonations.filter(d =>
          d.createdAt >= monthStart && d.createdAt <= monthEnd
        );

        return {
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          amount: monthDonations.reduce((sum, d) => sum + Number(d.amount), 0),
          count: monthDonations.length,
        };
      }).reverse();

      res.json({
        success: true,
        stats: {
          overview: {
            fundingGoal: Number(student.fundingGoal),
            amountRaised: Number(student.amountRaised),
            fundingProgress: Number(student.fundingGoal) > 0
              ? Math.round((Number(student.amountRaised) / Number(student.fundingGoal)) * 100)
              : 0,
            memberSince: student.createdAt,
          },
          donations: {
            total: totalRaised,
            count: completedDonations.length,
            average: completedDonations.length > 0
              ? totalRaised / completedDonations.length
              : 0,
            pending: donations.filter(d => d.status === 'pending').length,
          },
          registry: {
            totalItems: registries.length,
            totalValue: registryStats.totalValue,
            totalFunded: registryStats.totalFunded,
            fullyFundedItems: registryStats.fullyFundedItems,
            fundingProgress: registryStats.totalValue > 0
              ? Math.round((registryStats.totalFunded / registryStats.totalValue) * 100)
              : 0,
            byCategory: registryStats.byCategory,
          },
          trends: {
            monthly: monthlyTrends,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching profile stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile statistics',
      });
    }
  }
);

// GET /api/students/check-url/:url - Check if profile URL is available
router.get('/check-url/:url',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireStudent,
  param('url').matches(/^[a-z0-9-]+$/).withMessage('Invalid URL format'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid URL format',
          errors: errors.array(),
        });
      }

      const { url } = req.params;

      const existingStudent = await prisma.student.findFirst({
        where: {
          profileUrl: url,
          userId: { not: req.user!.id },
        },
      });

      res.json({
        success: true,
        data: {
          url,
          available: !existingStudent,
          message: existingStudent
            ? 'URL is already taken'
            : 'URL is available',
        },
      });
    } catch (error) {
      console.error('Error checking URL availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check URL availability',
      });
    }
  }
);

// PATCH /api/students/profile/settings - Update specific profile settings
router.patch('/profile/settings',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireStudent,
  [
    body('emailNotifications').optional().isBoolean(),
    body('publicProfile').optional().isBoolean(),
    body('showDonorNames').optional().isBoolean(),
    body('allowMessages').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { publicProfile, showDonorNames, allowMessages } = req.body;

      const updatedStudent = await prisma.student.update({
        where: { id: req.user!.id },
        data: {
          ...(publicProfile !== undefined && { publicProfile }),
          ...(showDonorNames !== undefined && { showDonorNames }),
          ...(allowMessages !== undefined && { allowMessages }),
        },
        select: {
          id: true,
          publicProfile: true,
          showDonorNames: true,
          allowMessages: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        message: 'Profile settings updated successfully',
        data: {
          settings: {
            publicProfile: updatedStudent.publicProfile,
            showDonorNames: updatedStudent.showDonorNames,
            allowMessages: updatedStudent.allowMessages,
          },
          updatedAt: updatedStudent.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error updating profile settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile settings',
      });
    }
  }
);

// GET /api/students/registry - List all registry items for the current student
router.get('/registry',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireStudent,
  async (req: Request, res: Response) => {
    try {
      const student = await prisma.student.findUnique({
        where: { id: req.user!.id },
        select: { id: true }
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }

      const registries = await prisma.registry.findMany({
        where: { studentId: student.id },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
      });

      // Format data to match frontend expectations
      const formattedItems = registries.map(item => ({
        id: item.id,
        name: item.itemName,
        description: item.itemDescription || '',
        price: parseFloat(item.price.toString()),
        priority: item.priority as 'high' | 'medium' | 'low',
        category: item.category,
        isReceived: item.fundedStatus === 'received'
      }));

      res.json({
        success: true,
        items: formattedItems
      });
    } catch (error) {
      console.error('Error listing registry items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list registry items'
      });
    }
  }
);

// POST /api/students/registry - Add a registry item
router.post('/registry',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireStudent,
  validateRegistry,
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      const { itemName, name, price, category, itemDescription, description, priority } = req.body;

      const student = await prisma.student.findUnique({
        where: { id: req.user!.id },
        select: { id: true }
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }

      // Support both frontend and backend field names
      const finalItemName = name || itemName;
      const finalDescription = description || itemDescription;

      if (!finalItemName) {
        return res.status(400).json({
          success: false,
          message: 'Item name is required',
        });
      }

      const registry = await prisma.registry.create({
        data: {
          studentId: student.id,
          itemName: finalItemName,
          price: parseFloat(price.toString()),
          category,
          itemDescription: finalDescription,
          priority: priority || 'medium',
          fundedStatus: 'needed',
          amountFunded: 0,
        },
      });

      // Format response to match frontend expectations
      const formattedItem = {
        id: registry.id,
        name: registry.itemName,
        description: registry.itemDescription || '',
        price: parseFloat(registry.price.toString()),
        priority: registry.priority as 'high' | 'medium' | 'low',
        category: registry.category,
        isReceived: registry.fundedStatus === 'received'
      };

      res.status(201).json({
        success: true,
        item: formattedItem,
        message: 'Registry item created successfully'
      });
    } catch (error) {
      console.error('Error adding registry item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add registry item'
      });
    }
  }
);

// PUT /api/students/registry/:id - Update a registry item
router.put('/registry/:id',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireStudent,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { itemName, name, price, category, itemDescription, description, priority, isReceived } = req.body;

      const student = await prisma.student.findUnique({
        where: { id: req.user!.id },
        select: { id: true }
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }

      // Check if registry item exists and belongs to this student
      const existingItem = await prisma.registry.findFirst({
        where: {
          id,
          studentId: student.id
        }
      });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Registry item not found'
        });
      }

      // Support both frontend and backend field names
      const finalItemName = name || itemName;
      const finalDescription = description || itemDescription;

      // Prepare update data
      const updateData: any = {};
      if (finalItemName !== undefined) updateData.itemName = finalItemName;
      if (finalDescription !== undefined) updateData.itemDescription = finalDescription;
      if (price !== undefined) updateData.price = parseFloat(price.toString());
      if (category !== undefined) updateData.category = category;
      if (priority !== undefined) updateData.priority = priority;
      if (isReceived !== undefined) updateData.fundedStatus = isReceived ? 'received' : 'needed';

      const updatedRegistry = await prisma.registry.update({
        where: { id },
        data: updateData,
      });

      // Format response to match frontend expectations
      const formattedItem = {
        id: updatedRegistry.id,
        name: updatedRegistry.itemName,
        description: updatedRegistry.itemDescription || '',
        price: parseFloat(updatedRegistry.price.toString()),
        priority: updatedRegistry.priority as 'high' | 'medium' | 'low',
        category: updatedRegistry.category,
        isReceived: updatedRegistry.fundedStatus === 'received'
      };

      res.json({
        success: true,
        item: formattedItem,
        message: 'Registry item updated successfully'
      });
    } catch (error) {
      console.error('Error updating registry item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update registry item'
      });
    }
  }
);

// DELETE /api/students/registry/:id - Delete a registry item
router.delete('/registry/:id',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireStudent,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const student = await prisma.student.findUnique({
        where: { id: req.user!.id },
        select: { id: true }
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }

      // Check if registry item exists and belongs to this student
      const existingItem = await prisma.registry.findFirst({
        where: {
          id,
          studentId: student.id
        }
      });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Registry item not found'
        });
      }

      // Delete the registry item
      await prisma.registry.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Registry item deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting registry item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete registry item'
      });
    }
  }
);

// Add this route
router.get('/public/:profileUrl', async (req, res) => {
  try {
    const { profileUrl } = req.params;

    const student = await prisma.student.findUnique({
      where: { 
        profileUrl,
        verified: true, // Only show verified students
        isActive: true,
        publicProfile: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        schoolName: true,
        major: true,
        bio: true,
        profilePhoto: true,
        fundingGoal: true,
        amountRaised: true,
        graduationYear: true,
        gpa: true,
        achievements: true,
        financialNeed: true,
        phoneNumber: true,
        linkedinUrl: true,
        personalStatement: true,
        registries: {
          select: {
            id: true,
            itemName: true,
            price: true,
            category: true,
            itemDescription: true,
            fundedStatus: true,
            amountFunded: true,
          },
        },
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Get donation count separately - exclude registration fees
    const donationCount = await prisma.donation.count({
      where: {
        studentId: student.id,
        donationType: {
          not: 'registration_fee'
        },
        status: 'completed'
      }
    });

    // Calculate stats
    const stats = {
      totalDonations: donationCount,
      totalRegistryItems: student.registries.length,
      fundingProgress: Number(student.fundingGoal) > 0
        ? Math.round((Number(student.amountRaised) / Number(student.fundingGoal)) * 100)
        : 0,
    };

    // Calculate profile completion percentage
    const requiredFields = ['firstName', 'lastName', 'schoolName', 'major', 'bio'];
    const completedFields = requiredFields.filter(field => {
      const value = student[field as keyof typeof student];
      return value !== null && value !== undefined && value !== '';
    });
    const profileCompletion = Math.round((completedFields.length / requiredFields.length) * 100);

    // Format the response to match what the frontend expects
    const publicProfile = {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      school: student.schoolName,
      schoolName: student.schoolName, // Include both for compatibility
      major: student.major,
      bio: student.bio,
      profilePhoto: student.profilePhoto,
      fundingGoal: student.fundingGoal ? parseFloat(student.fundingGoal.toString()) : 0,
      amountRaised: student.amountRaised ? parseFloat(student.amountRaised.toString()) : 0,
      graduationYear: student.graduationYear ? parseInt(student.graduationYear) : null,
      gpa: student.gpa ? parseFloat(student.gpa.toString()) : null,
      achievements: student.achievements,
      financialNeed: student.financialNeed,
      phoneNumber: student.phoneNumber,
      linkedinUrl: student.linkedinUrl,
      personalStatement: student.personalStatement,
      profileCompletion: profileCompletion,
      stats,
      registries: student.registries.map((registry: any) => ({
        id: registry.id,
        itemName: registry.itemName,
        price: parseFloat(registry.price.toString()),
        category: registry.category,
        description: registry.itemDescription,
        fundedStatus: registry.fundedStatus,
        amountFunded: parseFloat(registry.amountFunded?.toString() || '0'),
      }))
    };

    console.log('[PublicProfile] Returning profile data:', {
      fundingGoal: publicProfile.fundingGoal,
      amountRaised: publicProfile.amountRaised,
      fundingProgress: stats.fundingProgress
    });

    res.json({
      success: true,
      student: publicProfile
    });
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// UPDATED: GET /api/students/profile/photo/:filename - Serve profile photo with explicit CORS
router.get('/profile/photo/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Set CORS headers FIRST - before any processing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    console.log(`🖼️ [PHOTO ROUTE] Serving image: ${filename}`);

    const key = `profile-photos/${filename}`;

    // Get the file from S3
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME || 'village-uploads',
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      console.log(`❌ [PHOTO ROUTE] Photo not found: ${filename}`);
      return res.status(404).json({
        success: false,
        message: 'Photo not found',
      });
    }

    // Set content type
    res.setHeader('Content-Type', response.ContentType || 'image/jpeg');

    console.log(`✅ [PHOTO ROUTE] Sending image: ${filename}`);

    // Convert to buffer and send
    const chunks = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    res.send(buffer);
  } catch (error) {
    console.error('❌ [PHOTO ROUTE] Error serving profile photo:', error);

    // Set CORS headers even for errors
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    res.status(404).json({
      success: false,
      message: 'Photo not found',
    });
  }
});

// ADDED: OPTIONS handler for preflight requests
router.options('/profile/photo/:filename', (req, res) => {
  console.log(`🚁 [PHOTO OPTIONS] Preflight for: ${req.params.filename}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.status(200).end();
});

export default router;





// // backend/src/routes/student-profile.ts
// import express, { Request, Response } from 'express';
// import { PrismaClient } from '@prisma/client';
// import { body, param, validationResult } from 'express-validator';
// import { AuthMiddleware } from '../middleware/auth';
// import { s3Service } from '../services/aws/s3Service';
// import multer from 'multer';
// import { GetObjectCommand } from '@aws-sdk/client-s3';
// import { s3Client } from '../services/aws/config';
// import { Readable } from 'stream';
//
// const router = express.Router();
// const prisma = new PrismaClient();
//
// // Configure multer for file uploads
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
//   },
//   fileFilter: (req, file, cb) => {
//     const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['jpg', 'jpeg', 'png'];
//     const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
//
//     if (fileExtension && allowedTypes.includes(fileExtension)) {
//       cb(null, true);
//     } else {
//       cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
//     }
//   },
// });
//
// // Validation middleware
// const validateProfile = [
//   body('firstName')
//     .optional({ nullable: true })
//     .isLength({ min: 1, max: 50 })
//     .matches(/^[a-zA-Z\s'-]+$/)
//     .withMessage('First name must be 1-50 characters'),
//
//   body('lastName')
//     .optional({ nullable: true })
//     .isLength({ min: 1, max: 50 })
//     .matches(/^[a-zA-Z\s'-]+$/)
//     .withMessage('Last name must be 1-50 characters'),
//
//   body('school')
//     .optional({ checkFalsy: true, nullable: true })
//     .isLength({ min: 0, max: 100 })
//     .withMessage('School name must be 0-100 characters'),
//
//   body('major')
//     .optional({ checkFalsy: true, nullable: true })
//     .isLength({ min: 0, max: 100 })
//     .withMessage('Major must be 0-100 characters'),
//
//   body('bio')
//     .optional({ checkFalsy: true, nullable: true })
//     .isLength({ max: 1000 })
//     .withMessage('Bio must be less than 1000 characters'),
//
//   body('fundingGoal')
//     .optional({ checkFalsy: true, nullable: true })
//     .isFloat({ min: 0, max: 50000 })
//     .withMessage('Funding goal must be between $0 and $50,000'),
//
//   body('profileUrl')
//     .optional({ checkFalsy: true, nullable: true })
//     .matches(/^[a-z0-9-]+$/)
//     .withMessage('Profile URL must contain only lowercase letters, numbers, and hyphens'),
//
//   body('graduationYear')
//     .optional({ checkFalsy: true, nullable: true })
//     .isInt({ min: 2020, max: 2030 })
//     .withMessage('Graduation year must be between 2020 and 2030'),
//
//   body('gpa')
//     .optional({ checkFalsy: true, nullable: true })
//     .isFloat({ min: 0, max: 4.0 })
//     .withMessage('GPA must be between 0.0 and 4.0'),
//
//   body('phoneNumber')
//     .optional({ checkFalsy: true, nullable: true })
//     .matches(/^[\+]?[1-9][\d]{0,15}$/)
//     .withMessage('Invalid phone number format'),
//
//   body('linkedinUrl')
//     .optional({ checkFalsy: true, nullable: true })
//     .isURL()
//     .withMessage('Invalid LinkedIn URL'),
//
//   body('achievements')
//     .optional({ checkFalsy: true, nullable: true })
//     .isLength({ max: 2000 })
//     .withMessage('Achievements must be less than 2000 characters'),
//
//   body('financialNeed')
//     .optional({ checkFalsy: true, nullable: true })
//     .isLength({ max: 2000 })
//     .withMessage('Financial need description must be less than 2000 characters'),
//
//   body('personalStatement')
//     .optional({ checkFalsy: true, nullable: true })
//     .isLength({ max: 3000 })
//     .withMessage('Personal statement must be less than 3000 characters'),
// ];
//
// // Validation for registry item
// const validateRegistry = [
//   body('itemName').optional().isLength({ min: 1, max: 100 }).withMessage('Item name is required (1-100 characters)'),
//   body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Item name is required (1-100 characters)'),
//   body('price').isFloat({ min: 1, max: 5000 }).withMessage('Price must be between $1 and $5000'),
//   body('category').isLength({ min: 1, max: 50 }).withMessage('Category is required'),
//   body('priority').optional().isIn(['high', 'medium', 'low']).withMessage('Priority must be high, medium, or low'),
//   body('itemDescription').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
//   body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
// ];
//
// // GET /api/students/profile - Get current student's profile
// router.get('/profile',
//   AuthMiddleware.authenticateToken,
//   AuthMiddleware.requireStudent,
//   async (req: Request, res: Response) => {
//     try {
//       const student = await prisma.student.findUnique({
//         where: { id: req.user!.id },
//         select: {
//           id: true,
//           email: true,
//           firstName: true,
//           lastName: true,
//           schoolName: true,
//           major: true,
//           bio: true,
//           profilePhoto: true,
//           registrationStatus: true,
//           registrationPaid: true,
//           fundingGoal: true,
//           amountRaised: true,
//           profileUrl: true,
//           isActive: true,
//           graduationYear: true,
//           location: true,
//           createdAt: true,
//           updatedAt: true,
//           registries: {
//             select: {
//               id: true,
//               itemName: true,
//               price: true,
//               category: true,
//               priority: true,
//               fundedStatus: true,
//               amountFunded: true,
//               itemDescription: true,
//             },
//           },
//           donations: {
//             where: {
//               donationType: {
//                 not: 'registration_fee'
//               },
//               status: 'completed'
//             },
//             select: {
//               id: true
//             }
//           },
//           _count: {
//             select: {
//               registries: true,
//             },
//           },
//         },
//       });
//
//       if (!student) {
//         return res.status(404).json({
//           success: false,
//           message: 'Student profile not found',
//         });
//       }
//
//       // Calculate profile completion percentage
//       const requiredFields = ['firstName', 'lastName', 'schoolName', 'major', 'bio', 'graduationYear'];
//       const completedFields = requiredFields.filter(field => {
//         const value = student[field as keyof typeof student];
//         return value !== null && value !== undefined && value !== '';
//       });
//       const profileCompletion = Math.round((completedFields.length / requiredFields.length) * 100);
//
//       // Format data to match frontend expectations
//       const formattedProfile = {
//         id: student.id,
//         firstName: student.firstName,
//         lastName: student.lastName,
//         email: student.email,
//         school: student.schoolName,
//         major: student.major,
//         bio: student.bio,
//         profilePhoto: student.profilePhoto,
//         fundingGoal: student.fundingGoal ? parseFloat(student.fundingGoal.toString()) : null,
//         amountRaised: student.amountRaised ? parseFloat(student.amountRaised.toString()) : 0,
//         profileUrl: student.profileUrl,
//         graduationYear: student.graduationYear ? parseInt(student.graduationYear) : null,
//         location: student.location,
//         registrationStatus: student.registrationStatus,
//         registrationPaid: student.registrationPaid,
//         isActive: student.isActive,
//         createdAt: student.createdAt,
//         updatedAt: student.updatedAt,
//         profileCompletion,
//         stats: {
//           totalDonations: student.donations.length,
//           totalRegistryItems: student._count.registries,
//           fundingProgress: Number(student.fundingGoal) > 0
//             ? Math.round((Number(student.amountRaised) / Number(student.fundingGoal)) * 100)
//             : 0,
//         },
//       };
//
//       res.json({
//         success: true,
//         profile: formattedProfile,
//       });
//     } catch (error) {
//       console.error('Error fetching student profile:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to fetch profile',
//       });
//     }
//   }
// );
//
// // PUT /api/students/profile - Update current student's profile
// router.put('/profile',
//   AuthMiddleware.authenticateToken,
//   AuthMiddleware.requireStudent,
//   validateProfile,
//   async (req: Request, res: Response) => {
//     // --- DEBUG STATEMENTS ---
//     console.log('DEBUG: req.user:', req.user);
//     console.log('DEBUG: Incoming profile update payload:', req.body);
//
//     // Check for validation errors
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       console.log('DEBUG: Validation errors:', errors.array());
//       return res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array()
//       });
//     }
//     // --- END DEBUG STATEMENTS ---
//
//     try {
//       const {
//         firstName,
//         lastName,
//         school,
//         major,
//         bio,
//         fundingGoal,
//         profileUrl,
//         graduationYear,
//         gpa,
//         phoneNumber,
//         linkedinUrl,
//         achievements,
//         financialNeed,
//         personalStatement
//       } = req.body;
//
//       // Check if profileUrl is unique (if provided)
//       if (profileUrl) {
//         const existingStudent = await prisma.student.findFirst({
//           where: {
//             profileUrl,
//             userId: { not: req.user!.id },
//           },
//         });
//
//         if (existingStudent) {
//           return res.status(400).json({
//             success: false,
//             message: 'Profile URL is already taken',
//           });
//         }
//       }
//
//       const updatedStudent = await prisma.student.update({
//         where: { id: req.user!.id },
//         data: {
//           ...(firstName && { firstName }),
//           ...(lastName && { lastName }),
//           ...(school && { schoolName: school }),
//           ...(major && { major }),
//           ...(bio && { bio }),
//           ...(fundingGoal !== undefined && { fundingGoal }),
//           ...(profileUrl && { profileUrl }),
//           ...(graduationYear && { graduationYear: graduationYear.toString() }),
//           ...(gpa !== undefined && { gpa }),
//           ...(phoneNumber && { phoneNumber }),
//           ...(linkedinUrl && { linkedinUrl }),
//           ...(achievements && { achievements }),
//           ...(financialNeed && { financialNeed }),
//           ...(personalStatement && { personalStatement }),
//         },
//         select: {
//           id: true,
//           email: true,
//           firstName: true,
//           lastName: true,
//           schoolName: true,
//           major: true,
//           bio: true,
//           profilePhoto: true,
//           fundingGoal: true,
//           amountRaised: true,
//           profileUrl: true,
//           graduationYear: true,
//           updatedAt: true,
//           gpa: true,
//           achievements: true,
//           financialNeed: true,
//           phoneNumber: true,
//           linkedinUrl: true,
//           personalStatement: true,
//         },
//       });
//
//       // Format response to match frontend expectations
//       const formattedProfile = {
//         id: updatedStudent.id,
//         firstName: updatedStudent.firstName,
//         lastName: updatedStudent.lastName,
//         email: updatedStudent.email,
//         school: updatedStudent.schoolName,
//         major: updatedStudent.major,
//         bio: updatedStudent.bio,
//         profilePhoto: updatedStudent.profilePhoto,
//         fundingGoal: updatedStudent.fundingGoal ? parseFloat(updatedStudent.fundingGoal.toString()) : null,
//         amountRaised: updatedStudent.amountRaised ? parseFloat(updatedStudent.amountRaised.toString()) : 0,
//         profileUrl: updatedStudent.profileUrl,
//         graduationYear: updatedStudent.graduationYear ? parseInt(updatedStudent.graduationYear) : null,
//         updatedAt: updatedStudent.updatedAt,
//         gpa: updatedStudent.gpa ? parseFloat(updatedStudent.gpa.toString()) : null,
//         achievements: updatedStudent.achievements,
//         financialNeed: updatedStudent.financialNeed,
//         phoneNumber: updatedStudent.phoneNumber,
//         linkedinUrl: updatedStudent.linkedinUrl,
//         personalStatement: updatedStudent.personalStatement,
//       };
//
//       res.json({
//         success: true,
//         message: 'Profile updated successfully',
//         profile: formattedProfile,
//       });
//     } catch (error) {
//       console.error('Error updating student profile:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to update profile',
//       });
//     }
//   }
// );
//
// // POST /api/students/profile/photo - Upload profile photo
// router.post('/profile/photo',
//   AuthMiddleware.authenticateToken,
//   AuthMiddleware.requireStudent,
//   upload.single('photo'),
//   async (req: Request, res: Response) => {
//     try {
//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           message: 'No photo file provided',
//         });
//       }
//
//       const fileName = `profile-${req.user!.id}-${Date.now()}.${req.file.originalname.split('.').pop()}`;
//       const { key, url } = await s3Service.uploadFile(
//         req.file.buffer,
//         fileName,
//         req.file.mimetype,
//         'profile-photos'
//       );
//
//       const updatedStudent = await prisma.student.update({
//         where: { id: req.user!.id },
//         data: { profilePhoto: url },
//         select: {
//           id: true,
//           profilePhoto: true,
//           updatedAt: true,
//         },
//       });
//
//       res.json({
//         success: true,
//         message: 'Profile photo updated successfully',
//         data: {
//           profilePhoto: updatedStudent.profilePhoto,
//           uploadInfo: {
//             key,
//             url,
//             originalName: req.file.originalname,
//             size: req.file.size,
//           },
//         },
//       });
//     } catch (error) {
//       console.error('Error uploading profile photo:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to upload profile photo',
//       });
//     }
//   }
// );
//
// // DELETE /api/students/profile/photo - Remove profile photo
// router.delete('/profile/photo',
//   AuthMiddleware.authenticateToken,
//   AuthMiddleware.requireStudent,
//   async (req: Request, res: Response) => {
//     try {
//       const student = await prisma.student.findUnique({
//         where: { id: req.user!.id },
//         select: { profilePhoto: true },
//       });
//
//       if (!student?.profilePhoto) {
//         return res.status(400).json({
//           success: false,
//           message: 'No profile photo to remove',
//         });
//       }
//
//       try {
//         const urlParts = student.profilePhoto.split('/');
//         const key = `profile-photos/${urlParts[urlParts.length - 1]}`;
//         await s3Service.deleteFile(key);
//       } catch (s3Error) {
//         console.warn('Failed to delete file from S3:', s3Error);
//       }
//
//       await prisma.student.update({
//         where: { id: req.user!.id },
//         data: { profilePhoto: null },
//       });
//
//       res.json({
//         success: true,
//         message: 'Profile photo removed successfully',
//       });
//     } catch (error) {
//       console.error('Error removing profile photo:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to remove profile photo',
//       });
//     }
//   }
// );
//
// // GET /api/students/profile/stats - Get detailed profile statistics
// router.get('/profile/stats',
//   AuthMiddleware.authenticateToken,
//   AuthMiddleware.requireStudent,
//   async (req: Request, res: Response) => {
//     try {
//       // First get the student to get their ID
//       const currentStudent = await prisma.student.findUnique({
//         where: { id: req.user!.id },
//         select: { id: true }
//       });
//
//       if (!currentStudent) {
//         return res.status(404).json({
//           success: false,
//           message: 'Student not found',
//         });
//       }
//
//       const [student, donations, registries] = await Promise.all([
//         prisma.student.findUnique({
//           where: { id: req.user!.id },
//           select: {
//             fundingGoal: true,
//             amountRaised: true,
//             createdAt: true,
//           },
//         }),
//         prisma.donation.findMany({
//           where: { studentId: currentStudent.id }, // Use correct student ID
//           select: {
//             amount: true,
//             createdAt: true,
//             status: true,
//           },
//         }),
//         prisma.registry.findMany({
//           where: { studentId: currentStudent.id }, // Use correct student ID
//           select: {
//             price: true,
//             amountFunded: true,
//             fundedStatus: true,
//             category: true,
//           },
//         }),
//       ]);
//
//       if (!student) {
//         return res.status(404).json({
//           success: false,
//           message: 'Student not found',
//         });
//       }
//
//       // Calculate statistics
//       const completedDonations = donations.filter(d => d.status === 'completed');
//       const totalRaised = completedDonations.reduce((sum, d) => sum + Number(d.amount), 0);
//
//       const registryStats = registries.reduce((acc, registry) => {
//         acc.totalValue += Number(registry.price);
//         acc.totalFunded += Number(registry.amountFunded);
//
//         if (registry.fundedStatus === 'funded') {
//           acc.fullyFundedItems++;
//         }
//
//         acc.byCategory[registry.category] = (acc.byCategory[registry.category] || 0) + 1;
//
//         return acc;
//       }, {
//         totalValue: 0,
//         totalFunded: 0,
//         fullyFundedItems: 0,
//         byCategory: {} as Record<string, number>,
//       });
//
//       // Monthly donation trends (last 12 months)
//       const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
//         const date = new Date();
//         date.setMonth(date.getMonth() - i);
//         const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
//         const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
//
//         const monthDonations = completedDonations.filter(d =>
//           d.createdAt >= monthStart && d.createdAt <= monthEnd
//         );
//
//         return {
//           month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
//           amount: monthDonations.reduce((sum, d) => sum + Number(d.amount), 0),
//           count: monthDonations.length,
//         };
//       }).reverse();
//
//       res.json({
//         success: true,
//         stats: {
//           overview: {
//             fundingGoal: Number(student.fundingGoal),
//             amountRaised: Number(student.amountRaised),
//             fundingProgress: Number(student.fundingGoal) > 0
//               ? Math.round((Number(student.amountRaised) / Number(student.fundingGoal)) * 100)
//               : 0,
//             memberSince: student.createdAt,
//           },
//           donations: {
//             total: totalRaised,
//             count: completedDonations.length,
//             average: completedDonations.length > 0
//               ? totalRaised / completedDonations.length
//               : 0,
//             pending: donations.filter(d => d.status === 'pending').length,
//           },
//           registry: {
//             totalItems: registries.length,
//             totalValue: registryStats.totalValue,
//             totalFunded: registryStats.totalFunded,
//             fullyFundedItems: registryStats.fullyFundedItems,
//             fundingProgress: registryStats.totalValue > 0
//               ? Math.round((registryStats.totalFunded / registryStats.totalValue) * 100)
//               : 0,
//             byCategory: registryStats.byCategory,
//           },
//           trends: {
//             monthly: monthlyTrends,
//           },
//         },
//       });
//     } catch (error) {
//       console.error('Error fetching profile stats:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to fetch profile statistics',
//       });
//     }
//   }
// );
//
// // GET /api/students/check-url/:url - Check if profile URL is available
// router.get('/check-url/:url',
//   AuthMiddleware.authenticateToken,
//   AuthMiddleware.requireStudent,
//   param('url').matches(/^[a-z0-9-]+$/).withMessage('Invalid URL format'),
//   async (req: Request, res: Response) => {
//     try {
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid URL format',
//           errors: errors.array(),
//         });
//       }
//
//       const { url } = req.params;
//
//       const existingStudent = await prisma.student.findFirst({
//         where: {
//           profileUrl: url,
//           userId: { not: req.user!.id },
//         },
//       });
//
//       res.json({
//         success: true,
//         data: {
//           url,
//           available: !existingStudent,
//           message: existingStudent
//             ? 'URL is already taken'
//             : 'URL is available',
//         },
//       });
//     } catch (error) {
//       console.error('Error checking URL availability:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to check URL availability',
//       });
//     }
//   }
// );
//
// // PATCH /api/students/profile/settings - Update specific profile settings
// router.patch('/profile/settings',
//   AuthMiddleware.authenticateToken,
//   AuthMiddleware.requireStudent,
//   [
//     body('emailNotifications').optional().isBoolean(),
//     body('publicProfile').optional().isBoolean(),
//     body('showDonorNames').optional().isBoolean(),
//     body('allowMessages').optional().isBoolean(),
//   ],
//   async (req: Request, res: Response) => {
//     try {
//       const errors = validationResult(req);
//       if (!errors.isEmpty()) {
//         return res.status(400).json({
//           success: false,
//           message: 'Validation failed',
//           errors: errors.array(),
//         });
//       }
//
//       const { publicProfile, showDonorNames, allowMessages } = req.body;
//
//       const updatedStudent = await prisma.student.update({
//         where: { id: req.user!.id },
//         data: {
//           ...(publicProfile !== undefined && { publicProfile }),
//           ...(showDonorNames !== undefined && { showDonorNames }),
//           ...(allowMessages !== undefined && { allowMessages }),
//         },
//         select: {
//           id: true,
//           publicProfile: true,
//           showDonorNames: true,
//           allowMessages: true,
//           updatedAt: true,
//         },
//       });
//
//       res.json({
//         success: true,
//         message: 'Profile settings updated successfully',
//         data: {
//           settings: {
//             publicProfile: updatedStudent.publicProfile,
//             showDonorNames: updatedStudent.showDonorNames,
//             allowMessages: updatedStudent.allowMessages,
//           },
//           updatedAt: updatedStudent.updatedAt,
//         },
//       });
//     } catch (error) {
//       console.error('Error updating profile settings:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to update profile settings',
//       });
//     }
//   }
// );
//
// // GET /api/students/registry - List all registry items for the current student
// router.get('/registry',
//   AuthMiddleware.authenticateToken,
//   AuthMiddleware.requireStudent,
//   async (req: Request, res: Response) => {
//     try {
//       const student = await prisma.student.findUnique({
//         where: { id: req.user!.id },
//         select: { id: true }
//       });
//
//       if (!student) {
//         return res.status(404).json({
//           success: false,
//           message: 'Student not found',
//         });
//       }
//
//       const registries = await prisma.registry.findMany({
//         where: { studentId: student.id },
//         orderBy: [
//           { priority: 'desc' },
//           { createdAt: 'desc' }
//         ],
//       });
//
//       // Format data to match frontend expectations
//       const formattedItems = registries.map(item => ({
//         id: item.id,
//         name: item.itemName,
//         description: item.itemDescription || '',
//         price: parseFloat(item.price.toString()),
//         priority: item.priority as 'high' | 'medium' | 'low',
//         category: item.category,
//         isReceived: item.fundedStatus === 'received'
//       }));
//
//       res.json({
//         success: true,
//         items: formattedItems
//       });
//     } catch (error) {
//       console.error('Error listing registry items:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to list registry items'
//       });
//     }
//   }
// );
//
// // POST /api/students/registry - Add a registry item
// router.post('/registry',
//   AuthMiddleware.authenticateToken,
//   AuthMiddleware.requireStudent,
//   validateRegistry,
//   async (req: Request, res: Response) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation failed',
//         errors: errors.array()
//       });
//     }
//
//     try {
//       const { itemName, name, price, category, itemDescription, description, priority } = req.body;
//
//       const student = await prisma.student.findUnique({
//         where: { id: req.user!.id },
//         select: { id: true }
//       });
//
//       if (!student) {
//         return res.status(404).json({
//           success: false,
//           message: 'Student not found',
//         });
//       }
//
//       // Support both frontend and backend field names
//       const finalItemName = name || itemName;
//       const finalDescription = description || itemDescription;
//
//       if (!finalItemName) {
//         return res.status(400).json({
//           success: false,
//           message: 'Item name is required',
//         });
//       }
//
//       const registry = await prisma.registry.create({
//         data: {
//           studentId: student.id,
//           itemName: finalItemName,
//           price: parseFloat(price.toString()),
//           category,
//           itemDescription: finalDescription,
//           priority: priority || 'medium',
//           fundedStatus: 'needed',
//           amountFunded: 0,
//         },
//       });
//
//       // Format response to match frontend expectations
//       const formattedItem = {
//         id: registry.id,
//         name: registry.itemName,
//         description: registry.itemDescription || '',
//         price: parseFloat(registry.price.toString()),
//         priority: registry.priority as 'high' | 'medium' | 'low',
//         category: registry.category,
//         isReceived: registry.fundedStatus === 'received'
//       };
//
//       res.status(201).json({
//         success: true,
//         item: formattedItem,
//         message: 'Registry item created successfully'
//       });
//     } catch (error) {
//       console.error('Error adding registry item:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to add registry item'
//       });
//     }
//   }
// );
//
// // PUT /api/students/registry/:id - Update a registry item
// router.put('/registry/:id',
//   AuthMiddleware.authenticateToken,
//   AuthMiddleware.requireStudent,
//   async (req: Request, res: Response) => {
//     try {
//       const { id } = req.params;
//       const { itemName, name, price, category, itemDescription, description, priority, isReceived } = req.body;
//
//       const student = await prisma.student.findUnique({
//         where: { id: req.user!.id },
//         select: { id: true }
//       });
//
//       if (!student) {
//         return res.status(404).json({
//           success: false,
//           message: 'Student not found',
//         });
//       }
//
//       // Check if registry item exists and belongs to this student
//       const existingItem = await prisma.registry.findFirst({
//         where: {
//           id,
//           studentId: student.id
//         }
//       });
//
//       if (!existingItem) {
//         return res.status(404).json({
//           success: false,
//           message: 'Registry item not found'
//         });
//       }
//
//       // Support both frontend and backend field names
//       const finalItemName = name || itemName;
//       const finalDescription = description || itemDescription;
//
//       // Prepare update data
//       const updateData: any = {};
//       if (finalItemName !== undefined) updateData.itemName = finalItemName;
//       if (finalDescription !== undefined) updateData.itemDescription = finalDescription;
//       if (price !== undefined) updateData.price = parseFloat(price.toString());
//       if (category !== undefined) updateData.category = category;
//       if (priority !== undefined) updateData.priority = priority;
//       if (isReceived !== undefined) updateData.fundedStatus = isReceived ? 'received' : 'needed';
//
//       const updatedRegistry = await prisma.registry.update({
//         where: { id },
//         data: updateData,
//       });
//
//       // Format response to match frontend expectations
//       const formattedItem = {
//         id: updatedRegistry.id,
//         name: updatedRegistry.itemName,
//         description: updatedRegistry.itemDescription || '',
//         price: parseFloat(updatedRegistry.price.toString()),
//         priority: updatedRegistry.priority as 'high' | 'medium' | 'low',
//         category: updatedRegistry.category,
//         isReceived: updatedRegistry.fundedStatus === 'received'
//       };
//
//       res.json({
//         success: true,
//         item: formattedItem,
//         message: 'Registry item updated successfully'
//       });
//     } catch (error) {
//       console.error('Error updating registry item:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to update registry item'
//       });
//     }
//   }
// );
//
// // DELETE /api/students/registry/:id - Delete a registry item
// router.delete('/registry/:id',
//   AuthMiddleware.authenticateToken,
//   AuthMiddleware.requireStudent,
//   async (req: Request, res: Response) => {
//     try {
//       const { id } = req.params;
//
//       const student = await prisma.student.findUnique({
//         where: { id: req.user!.id },
//         select: { id: true }
//       });
//
//       if (!student) {
//         return res.status(404).json({
//           success: false,
//           message: 'Student not found',
//         });
//       }
//
//       // Check if registry item exists and belongs to this student
//       const existingItem = await prisma.registry.findFirst({
//         where: {
//           id,
//           studentId: student.id
//         }
//       });
//
//       if (!existingItem) {
//         return res.status(404).json({
//           success: false,
//           message: 'Registry item not found'
//         });
//       }
//
//       // Delete the registry item
//       await prisma.registry.delete({
//         where: { id }
//       });
//
//       res.json({
//         success: true,
//         message: 'Registry item deleted successfully'
//       });
//     } catch (error) {
//       console.error('Error deleting registry item:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to delete registry item'
//       });
//     }
//   }
// );
//
// // Add this route
// router.get('/public/:profileUrl', async (req, res) => {
//   try {
//     const { profileUrl } = req.params;
//
//     const student = await prisma.student.findUnique({
//       where: { profileUrl },
//       select: {
//         id: true,
//         firstName: true,
//         lastName: true,
//         email: true,
//         schoolName: true,
//         major: true,
//         bio: true,
//         profilePhoto: true,
//         fundingGoal: true,
//         amountRaised: true,
//         graduationYear: true,
//         gpa: true,
//         achievements: true,
//         financialNeed: true,
//         phoneNumber: true,
//         linkedinUrl: true,
//         personalStatement: true,
//         registries: {
//           select: {
//             id: true,
//             itemName: true,
//             price: true,
//             category: true,
//             itemDescription: true,
//             fundedStatus: true,
//             amountFunded: true,
//           },
//         },
//       }
//     });
//
//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: 'Profile not found'
//       });
//     }
//
//     // Get donation count separately - exclude registration fees
//     const donationCount = await prisma.donation.count({
//       where: {
//         studentId: student.id,
//         donationType: {
//           not: 'registration_fee'
//         },
//         status: 'completed'
//       }
//     });
//
//     // Calculate stats
//     const stats = {
//       totalDonations: donationCount,
//       totalRegistryItems: student.registries.length,
//       fundingProgress: Number(student.fundingGoal) > 0
//         ? Math.round((Number(student.amountRaised) / Number(student.fundingGoal)) * 100)
//         : 0,
//     };
//
//     // Calculate profile completion percentage
//     const requiredFields = ['firstName', 'lastName', 'schoolName', 'major', 'bio'];
//     const completedFields = requiredFields.filter(field => {
//       const value = student[field as keyof typeof student];
//       return value !== null && value !== undefined && value !== '';
//     });
//     const profileCompletion = Math.round((completedFields.length / requiredFields.length) * 100);
//
//     // Format the response to match what the frontend expects
//     const publicProfile = {
//       id: student.id,
//       firstName: student.firstName,
//       lastName: student.lastName,
//       email: student.email,
//       school: student.schoolName,
//       schoolName: student.schoolName, // Include both for compatibility
//       major: student.major,
//       bio: student.bio,
//       profilePhoto: student.profilePhoto,
//       fundingGoal: student.fundingGoal ? parseFloat(student.fundingGoal.toString()) : 0,
//       amountRaised: student.amountRaised ? parseFloat(student.amountRaised.toString()) : 0,
//       graduationYear: student.graduationYear ? parseInt(student.graduationYear) : null,
//       gpa: student.gpa ? parseFloat(student.gpa.toString()) : null,
//       achievements: student.achievements,
//       financialNeed: student.financialNeed,
//       phoneNumber: student.phoneNumber,
//       linkedinUrl: student.linkedinUrl,
//       personalStatement: student.personalStatement,
//       profileCompletion: profileCompletion,
//       stats,
//       registries: student.registries.map((registry: any) => ({
//         id: registry.id,
//         itemName: registry.itemName,
//         price: parseFloat(registry.price.toString()),
//         category: registry.category,
//         description: registry.itemDescription,
//         fundedStatus: registry.fundedStatus,
//         amountFunded: parseFloat(registry.amountFunded?.toString() || '0'),
//       }))
//     };
//
//     console.log('[PublicProfile] Returning profile data:', {
//       fundingGoal: publicProfile.fundingGoal,
//       amountRaised: publicProfile.amountRaised,
//       fundingProgress: stats.fundingProgress
//     });
//
//     res.json({
//       success: true,
//       student: publicProfile
//     });
//   } catch (error) {
//     console.error('Error fetching public profile:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch profile'
//     });
//   }
// });
//
// // GET /api/students/profile/photo/:filename - Serve profile photo
// router.get('/profile/photo/:filename', async (req, res) => {
//   try {
//     const { filename } = req.params;
//     const key = `profile-photos/${filename}`;
//
//     // Get the file from S3
//     const command = new GetObjectCommand({
//       Bucket: process.env.AWS_BUCKET_NAME || 'village-uploads',
//       Key: key,
//     });
//
//     const response = await s3Client.send(command);
//
//     if (!response.Body) {
//       return res.status(404).json({
//         success: false,
//         message: 'Photo not found',
//       });
//     }
//
//     // Set appropriate headers
//     res.setHeader('Content-Type', response.ContentType || 'image/jpeg');
//     res.setHeader('Cache-Control', 'public, max-age=31536000');
//     res.setHeader('Access-Control-Allow-Origin', '*');
//
//     // Convert to buffer and send
//     const chunks = [];
//     for await (const chunk of response.Body as any) {
//       chunks.push(chunk);
//     }
//     const buffer = Buffer.concat(chunks);
//     res.send(buffer);
//   } catch (error) {
//     console.error('Error serving profile photo:', error);
//     res.status(404).json({
//       success: false,
//       message: 'Photo not found',
//     });
//   }
// });
//
// export default router;