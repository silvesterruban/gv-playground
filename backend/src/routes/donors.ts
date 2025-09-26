// backend/src/routes/donors.ts - Create this new file
import { Router } from 'express';
import { DonorController } from '../controllers/donorController';
import { ValidationMiddleware } from '../middleware/validation';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();

// Public donor registration route (to match your curl command)
router.post('/register',
  ValidationMiddleware.validateDonorRegistration(),
  ValidationMiddleware.checkValidation,
  DonorController.registerDonor
);

// Protected donor routes (require authentication)
router.get('/profile',
  AuthMiddleware.authenticateToken,
  DonorController.getProfile
);

router.put('/profile',
  AuthMiddleware.authenticateToken,
  DonorController.updateProfile
);

router.get('/dashboard/stats',
  AuthMiddleware.authenticateToken,
  DonorController.getDashboardStats
);

// Student discovery
router.get('/students',
  AuthMiddleware.authenticateToken,
  DonorController.getStudents
);

router.get('/students/:studentId',
  AuthMiddleware.authenticateToken,
  DonorController.getStudentDetails
);

// Bookmarks
router.get('/bookmarks',
  AuthMiddleware.authenticateToken,
  DonorController.getBookmarks
);

router.post('/bookmarks',
  AuthMiddleware.authenticateToken,
  DonorController.createBookmark
);

router.patch('/bookmarks/:bookmarkId',
  AuthMiddleware.authenticateToken,
  DonorController.updateBookmark
);

router.delete('/bookmarks/:bookmarkId',
  AuthMiddleware.authenticateToken,
  DonorController.deleteBookmark
);

router.get('/bookmarks/check/:studentId',
  AuthMiddleware.authenticateToken,
  DonorController.checkBookmarkStatus
);

// Donation history
router.get('/donations',
  AuthMiddleware.authenticateToken,
  DonorController.getDonationHistory
);

export default router;