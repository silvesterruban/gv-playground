import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface BusinessMetrics {
  timestamp: string;
  period: 'today' | 'week' | 'month' | 'year';
  
  // User metrics
  users: {
    totalStudents: number;
    totalDonors: number;
    newStudentsToday: number;
    newDonorsToday: number;
    activeUsersToday: number;
    totalRegistrations: number;
  };
  
  // Donation metrics
  donations: {
    totalDonations: number;
    totalAmount: number;
    donationsToday: number;
    amountToday: number;
    averageDonation: number;
    topDonationAmount: number;
    donationsThisWeek: number;
    donationsThisMonth: number;
  };
  
  // Transaction metrics
  transactions: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    transactionsToday: number;
    totalVolume: number;
    volumeToday: number;
    averageTransactionValue: number;
  };
  
  // Website metrics
  website: {
    totalVisits: number;
    visitsToday: number;
    uniqueVisitors: number;
    pageViews: number;
    averageSessionDuration: number;
    bounceRate: number;
  };
  
  // Registry metrics
  registry: {
    totalRegistries: number;
    activeRegistries: number;
    completedRegistries: number;
    totalItems: number;
    fundedItems: number;
    fundingProgress: number;
  };
  
  // Growth metrics
  growth: {
    studentGrowthRate: number;
    donorGrowthRate: number;
    donationGrowthRate: number;
    revenueGrowthRate: number;
  };
}

export class AnalyticsService {
  
  // Get comprehensive business metrics
  static async getBusinessMetrics(period: 'today' | 'week' | 'month' | 'year' = 'today'): Promise<BusinessMetrics> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      
      // Get date range based on period
      let startDate: Date;
      switch (period) {
        case 'today':
          startDate = startOfDay;
          break;
        case 'week':
          startDate = startOfWeek;
          break;
        case 'month':
          startDate = startOfMonth;
          break;
        case 'year':
          startDate = startOfYear;
          break;
        default:
          startDate = startOfDay;
      }

      // User metrics
      const [totalStudents, totalDonors, newStudentsToday, newDonorsToday] = await Promise.all([
        prisma.student.count(),
        prisma.donor.count(),
        prisma.student.count({
          where: { createdAt: { gte: startOfDay } }
        }),
        prisma.donor.count({
          where: { createdAt: { gte: startOfDay } }
        })
      ]);

      // Donation metrics
      const [donations, donationsToday, donationsThisWeek, donationsThisMonth] = await Promise.all([
        prisma.donation.findMany(),
        prisma.donation.findMany({
          where: { processedAt: { gte: startOfDay } }
        }),
        prisma.donation.findMany({
          where: { processedAt: { gte: startOfWeek } }
        }),
        prisma.donation.findMany({
          where: { processedAt: { gte: startOfMonth } }
        })
      ]);

      // Calculate donation amounts
      const totalAmount = donations.reduce((sum, d) => sum + Number(d.amount), 0);
      const amountToday = donationsToday.reduce((sum, d) => sum + Number(d.amount), 0);
      const averageDonation = donations.length > 0 ? totalAmount / donations.length : 0;
      const topDonationAmount = donations.length > 0 ? Math.max(...donations.map(d => Number(d.amount))) : 0;

      // Registry metrics
      const [totalRegistries, activeRegistries, completedRegistries] = await Promise.all([
        prisma.registry.count(),
        prisma.registry.count({
          where: { fundedStatus: 'needed' }
        }),
        prisma.registry.count({
          where: { fundedStatus: 'funded' }
        })
      ]);

      // Calculate registry funding progress
      const registriesWithItems = await prisma.registry.findMany({
        include: {
          donationItems: true
        }
      });

      const totalItems = registriesWithItems.reduce((sum, r) => sum + r.donationItems.length, 0);
      const fundedItems = registriesWithItems.reduce((sum, r) => 
        sum + r.donationItems.length, 0 // Simplified - all items are considered funded for now
      );
      const fundingProgress = totalItems > 0 ? (fundedItems / totalItems) * 100 : 0;

      // Calculate growth rates (simplified - you might want to implement more sophisticated calculations)
      const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
      
      const [previousStudents, previousDonors, previousDonations] = await Promise.all([
        prisma.student.count({
          where: { createdAt: { gte: previousPeriodStart, lt: startDate } }
        }),
        prisma.donor.count({
          where: { createdAt: { gte: previousPeriodStart, lt: startDate } }
        }),
        prisma.donation.findMany({
          where: { processedAt: { gte: previousPeriodStart, lt: startDate } }
        })
      ]);

      const previousAmount = previousDonations.reduce((sum, d) => sum + Number(d.amount), 0);
      
      const studentGrowthRate = previousStudents > 0 ? ((newStudentsToday - previousStudents) / previousStudents) * 100 : 0;
      const donorGrowthRate = previousDonors > 0 ? ((newDonorsToday - previousDonors) / previousDonors) * 100 : 0;
      const donationGrowthRate = previousDonations.length > 0 ? ((donationsToday.length - previousDonations.length) / previousDonations.length) * 100 : 0;
      const revenueGrowthRate = previousAmount > 0 ? ((amountToday - previousAmount) / previousAmount) * 100 : 0;

      const metrics: BusinessMetrics = {
        timestamp: now.toISOString(),
        period,
        
        users: {
          totalStudents,
          totalDonors,
          newStudentsToday,
          newDonorsToday,
          activeUsersToday: newStudentsToday + newDonorsToday, // Simplified
          totalRegistrations: totalStudents + totalDonors
        },
        
        donations: {
          totalDonations: donations.length,
          totalAmount,
          donationsToday: donationsToday.length,
          amountToday,
          averageDonation,
          topDonationAmount,
          donationsThisWeek: donationsThisWeek.length,
          donationsThisMonth: donationsThisMonth.length
        },
        
        transactions: {
          totalTransactions: donations.length,
          successfulTransactions: donations.filter(d => d.status === 'COMPLETED').length,
          failedTransactions: donations.filter(d => d.status === 'FAILED').length,
          transactionsToday: donationsToday.length,
          totalVolume: totalAmount,
          volumeToday: amountToday,
          averageTransactionValue: averageDonation
        },
        
        website: {
          totalVisits: totalStudents + totalDonors, // Simplified - you might want to implement actual analytics
          visitsToday: newStudentsToday + newDonorsToday,
          uniqueVisitors: totalStudents + totalDonors,
          pageViews: (totalStudents + totalDonors) * 5, // Estimated
          averageSessionDuration: 300, // 5 minutes estimated
          bounceRate: 25 // 25% estimated
        },
        
        registry: {
          totalRegistries,
          activeRegistries,
          completedRegistries,
          totalItems,
          fundedItems,
          fundingProgress
        },
        
        growth: {
          studentGrowthRate,
          donorGrowthRate,
          donationGrowthRate,
          revenueGrowthRate
        }
      };

      return metrics;

    } catch (error) {
      Logger.error('Error getting business metrics:', error);
      throw error;
    }
  }

  // Get dashboard summary for admin
  static async getDashboardSummary(): Promise<any> {
    try {
      const todayMetrics = await this.getBusinessMetrics('today');
      const weekMetrics = await this.getBusinessMetrics('week');
      const monthMetrics = await this.getBusinessMetrics('month');

      return {
        timestamp: new Date().toISOString(),
        summary: {
          today: {
            newStudents: todayMetrics.users.newStudentsToday,
            newDonors: todayMetrics.users.newDonorsToday,
            donations: todayMetrics.donations.donationsToday,
            revenue: todayMetrics.donations.amountToday,
            activeRegistries: todayMetrics.registry.activeRegistries
          },
          week: {
            newStudents: weekMetrics.users.newStudentsToday,
            newDonors: weekMetrics.users.newDonorsToday,
            donations: weekMetrics.donations.donationsThisWeek,
            revenue: weekMetrics.donations.amountToday,
            activeRegistries: weekMetrics.registry.activeRegistries
          },
          month: {
            newStudents: monthMetrics.users.newStudentsToday,
            newDonors: monthMetrics.users.newDonorsToday,
            donations: monthMetrics.donations.donationsThisMonth,
            revenue: monthMetrics.donations.amountToday,
            activeRegistries: monthMetrics.registry.activeRegistries
          }
        },
        growth: todayMetrics.growth,
        alerts: this.generateAlerts(todayMetrics)
      };

    } catch (error) {
      Logger.error('Error getting dashboard summary:', error);
      throw error;
    }
  }

  // Generate alerts based on metrics
  private static generateAlerts(metrics: BusinessMetrics): string[] {
    const alerts: string[] = [];

    if (metrics.growth.studentGrowthRate < -10) {
      alerts.push('Student registrations are declining significantly');
    }

    if (metrics.growth.donorGrowthRate < -10) {
      alerts.push('Donor registrations are declining significantly');
    }

    if (metrics.growth.revenueGrowthRate < -20) {
      alerts.push('Revenue is declining significantly');
    }

    if (metrics.donations.averageDonation < 50) {
      alerts.push('Average donation amount is below expected threshold');
    }

    if (metrics.registry.fundingProgress < 30) {
      alerts.push('Registry funding progress is low');
    }

    return alerts;
  }

  // Get top performing metrics
  static async getTopPerformers(): Promise<any> {
    try {
      // Top donors
      const topDonors = await prisma.donor.findMany({
        include: {
          donations: true
        },
        orderBy: {
          donations: {
            _count: 'desc'
          }
        },
        take: 10
      });

      // Top funded registries
      const topRegistries = await prisma.registry.findMany({
        include: {
          donationItems: true,
          donations: true,
          student: true
        },
        orderBy: {
          donations: {
            _count: 'desc'
          }
        },
        take: 10
      });

      // Recent high-value donations
      const recentHighDonations = await prisma.donation.findMany({
        where: {
          amount: {
            gte: 1000 // $1000 or more
          }
        },
        include: {
          donor: true,
          student: true
        },
        orderBy: {
          processedAt: 'desc'
        },
        take: 10
      });

      return {
        topDonors: topDonors.map(donor => ({
          id: donor.id,
          email: donor.email,
          totalDonations: donor.donations.length,
          totalAmount: donor.donations.reduce((sum, d) => sum + Number(d.amount), 0)
        })),
        topRegistries: topRegistries.map(registry => ({
          id: registry.id,
          studentName: `${registry.student?.firstName} ${registry.student?.lastName}`,
          totalItems: registry.donationItems.length,
          fundedItems: registry.donationItems.length, // Simplified - all items are considered funded for now
          totalDonations: registry.donations.length,
          fundingProgress: 100 // Simplified - all items are considered funded for now
        })),
        recentHighDonations: recentHighDonations.map(donation => ({
          id: donation.id,
          amount: Number(donation.amount),
          donorEmail: donation.donorEmail,
          studentName: donation.student ? `${donation.student.firstName} ${donation.student.lastName}` : 'Anonymous',
          processedAt: donation.processedAt
        }))
      };

    } catch (error) {
      Logger.error('Error getting top performers:', error);
      throw error;
    }
  }
}
