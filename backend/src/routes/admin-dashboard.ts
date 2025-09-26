import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { authenticateToken } from '../middleware/auth';
import { Logger } from '../utils/logger';

const router = Router();

// Admin dashboard routes - require authentication
router.use(authenticateToken);

// Get comprehensive business metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as 'today' | 'week' | 'month' | 'year') || 'today';
    const metrics = await AnalyticsService.getBusinessMetrics(period);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    Logger.error('Error getting business metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get business metrics'
    });
  }
});

// Get dashboard summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = await AnalyticsService.getDashboardSummary();
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    Logger.error('Error getting dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard summary'
    });
  }
});

// Get top performers
router.get('/top-performers', async (req: Request, res: Response) => {
  try {
    const topPerformers = await AnalyticsService.getTopPerformers();
    
    res.json({
      success: true,
      data: topPerformers
    });
  } catch (error) {
    Logger.error('Error getting top performers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get top performers'
    });
  }
});

// Get client-friendly admin metrics
router.get('/client-metrics', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as 'today' | 'week' | 'month' | 'year') || 'today';
    const metrics = await AnalyticsService.getBusinessMetrics(period);
    
    // Format for client consumption
    const clientMetrics = {
      timestamp: metrics.timestamp,
      period: metrics.period,
      service: "GradVillage Admin Dashboard",
      status: "healthy",
      
      // Key business metrics
      overview: {
        totalStudents: metrics.users.totalStudents,
        totalDonors: metrics.users.totalDonors,
        totalDonations: metrics.donations.totalDonations,
        totalRevenue: Math.round(metrics.donations.totalAmount),
        activeRegistries: metrics.registry.activeRegistries,
        fundingProgress: Math.round(metrics.registry.fundingProgress)
      },
      
      // Today's activity
      today: {
        newStudents: metrics.users.newStudentsToday,
        newDonors: metrics.users.newDonorsToday,
        donations: metrics.donations.donationsToday,
        revenue: Math.round(metrics.donations.amountToday),
        averageDonation: Math.round(metrics.donations.averageDonation)
      },
      
      // Growth indicators
      growth: {
        studentGrowth: Math.round(metrics.growth.studentGrowthRate),
        donorGrowth: Math.round(metrics.growth.donorGrowthRate),
        donationGrowth: Math.round(metrics.growth.donationGrowthRate),
        revenueGrowth: Math.round(metrics.growth.revenueGrowthRate)
      },
      
      // Performance indicators
      performance: {
        averageDonation: Math.round(metrics.donations.averageDonation),
        topDonation: Math.round(metrics.donations.topDonationAmount),
        successRate: metrics.transactions.totalTransactions > 0 ? 
          Math.round((metrics.transactions.successfulTransactions / metrics.transactions.totalTransactions) * 100) : 0,
        fundingProgress: Math.round(metrics.registry.fundingProgress)
      },
      
      // Health status
      health: {
        status: metrics.growth.revenueGrowthRate > 0 ? "excellent" : 
                metrics.growth.revenueGrowthRate > -10 ? "good" : "needs_attention",
        alerts: metrics.growth.revenueGrowthRate < -20 ? ["Revenue declining"] : []
      }
    };
    
    res.json(clientMetrics);
  } catch (error) {
    Logger.error('Error getting client metrics:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      service: "GradVillage Admin Dashboard",
      status: "error",
      error: "Failed to retrieve metrics"
    });
  }
});

// Get real-time metrics for dashboard
router.get('/realtime', async (req: Request, res: Response) => {
  try {
    const todayMetrics = await AnalyticsService.getBusinessMetrics('today');
    
    const realtimeMetrics = {
      timestamp: new Date().toISOString(),
      live: {
        newStudentsToday: todayMetrics.users.newStudentsToday,
        newDonorsToday: todayMetrics.users.newDonorsToday,
        donationsToday: todayMetrics.donations.donationsToday,
        revenueToday: Math.round(todayMetrics.donations.amountToday),
        activeRegistries: todayMetrics.registry.activeRegistries
      },
      trends: {
        studentGrowth: Math.round(todayMetrics.growth.studentGrowthRate),
        donorGrowth: Math.round(todayMetrics.growth.donorGrowthRate),
        revenueGrowth: Math.round(todayMetrics.growth.revenueGrowthRate)
      }
    };
    
    res.json({
      success: true,
      data: realtimeMetrics
    });
  } catch (error) {
    Logger.error('Error getting real-time metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get real-time metrics'
    });
  }
});

export default router;

