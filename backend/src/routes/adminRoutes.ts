import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Student management routes
router.get('/students', authenticateToken, AdminController.getStudents);
router.get('/students/:studentId', authenticateToken, AdminController.getStudentDetails);
router.patch('/students/:studentId/status', authenticateToken, AdminController.updateStudentStatus);

// School verification routes
router.get('/verifications/pending', authenticateToken, AdminController.getPendingVerifications);
router.patch('/verifications/:verificationId', authenticateToken, AdminController.reviewSchoolVerification);

// Analytics routes
router.get('/analytics', authenticateToken, AdminController.getPlatformAnalytics);



export default router; 