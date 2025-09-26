import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { userRegistrations, userLogins, errorsTotal } from '../utils/metrics';
import { emailService } from '../services/emailService';

const prisma = new PrismaClient();

export class UserController {
  // Get user profile
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Profile retrieved for user: ${user.email}`);
      
      res.json({
        message: 'Profile retrieved successfully',
        user,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error retrieving profile:', error);
      errorsTotal.inc({ type: 'profile_retrieval', endpoint: 'GET /users/profile' });
      
      res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Update user profile
  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { name } = req.body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { name },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true
        }
      });

      logger.info(`Profile updated for user: ${user.email}`);
      
      res.json({
        message: 'Profile updated successfully',
        user,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error updating profile:', error);
      errorsTotal.inc({ type: 'profile_update', endpoint: 'PUT /users/profile' });
      
      res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Delete user account
  static async deleteAccount(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      await prisma.user.delete({
        where: { id: userId }
      });

      logger.info(`Account deleted for user ID: ${userId}`);
      
      res.json({
        message: 'Account deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error deleting account:', error);
      errorsTotal.inc({ type: 'account_deletion', endpoint: 'DELETE /users/profile' });
      
      res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get all users (admin function)
  static async getAllUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count()
      ]);

      const totalPages = Math.ceil(total / limit);

      logger.info(`Retrieved ${users.length} users (page ${page}/${totalPages})`);
      
      res.json({
        message: 'Users retrieved successfully',
        users,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error retrieving users:', error);
      errorsTotal.inc({ type: 'users_retrieval', endpoint: 'GET /users' });
      
      res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get user by ID
  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`User retrieved by ID: ${user.email}`);
      
      res.json({
        message: 'User retrieved successfully',
        user,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error retrieving user by ID:', error);
      errorsTotal.inc({ type: 'user_retrieval', endpoint: 'GET /users/:id' });
      
      res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
}