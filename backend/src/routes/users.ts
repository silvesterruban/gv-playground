import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { updateProfileValidation } from '../validators/authValidators';
import { handleValidationErrors } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication to all user routes
router.use(authenticateToken);

// GET /users/profile - Get current user's profile
router.get('/profile', UserController.getProfile);

// PUT /users/profile - Update current user's profile
router.put('/profile',
  updateProfileValidation,
  handleValidationErrors,
  UserController.updateProfile
);

// DELETE /users/profile - Delete current user's account
router.delete('/profile', UserController.deleteAccount);

// GET /users - Get all users (paginated)
router.get('/', UserController.getAllUsers);

// GET /users/:id - Get user by ID
router.get('/:id', UserController.getUserById);

export default router;