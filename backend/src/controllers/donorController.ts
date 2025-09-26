// backend/src/controllers/donorController.ts - Fixed TypeScript errors
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { JWTUtils } from '../utils/jwt';
import {
  DonorRegistrationData,
  DonorProfileUpdate,
  StudentDiscoveryQuery,
  DonorBookmarkCreate,
  DonorBookmarkUpdate,
  DonationHistoryQuery,
  DonorDashboardStats,
  StudentForDonor,
  StudentDetailForDonor,
  DonorResponse
} from '../types/donor';

const prisma = new PrismaClient();

export class DonorController {
  // Register new donor
  static async registerDonor(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, phone, address }: DonorRegistrationData = req.body;

      // Check if donor already exists
      const existingDonor = await prisma.donor.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingDonor) {
        res.status(400).json({
          success: false,
          message: 'A donor account with this email already exists'
        });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create donor
      console.log("DEBUG: Creating donor with email:", email.toLowerCase());
      const donor = await prisma.donor.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
          phone,
          address,
          preferences: {
            emailNotifications: true,
            publicProfile: false,
            preferredDonationAmount: 50
          }
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          verified: true,
          memberSince: true
        }
      });
      
      console.log("DEBUG: Donor created:", donor);

      // Generate JWT token
      const token = JWTUtils.generateToken({
        id: donor.id,
        email: donor.email,
        userType: 'donor',
        verified: donor.verified
      });
      
      console.log("DEBUG: Token generated:", token);

      const response = {
        success: true,
        message: 'Donor account created successfully',
        data: {
          donor,
          token
        }
      };
      
      console.log("DEBUG: Response:", JSON.stringify(response));
      
      res.status(201).json(response);

    } catch (error) {
      console.error('Error registering donor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create donor account'
      });
    }
  }

  // Get donor profile
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const donor = await prisma.donor.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          preferences: true,
          verified: true,
          memberSince: true,
          totalDonated: true,
          studentsSupported: true,
          impactScore: true,
          lastLogin: true,
          createdAt: true
        }
      });

      if (!donor) {
        res.status(404).json({
          success: false,
          message: 'Donor profile not found'
        });
        return;
      }

      // Update last login
      await prisma.donor.update({
        where: { id: req.user.id },
        data: { lastLogin: new Date() }
      });

      const donorResponse: DonorResponse = {
        id: donor.id,
        email: donor.email,
        firstName: donor.firstName,
        lastName: donor.lastName,
        phone: donor.phone || undefined,
        address: donor.address || undefined,
        preferences: donor.preferences || undefined,
        verified: donor.verified,
        memberSince: donor.memberSince,
        totalDonated: Number(donor.totalDonated),
        studentsSupported: donor.studentsSupported,
        impactScore: Number(donor.impactScore),
        lastLogin: donor.lastLogin || undefined,
        createdAt: donor.createdAt
      };

      res.json({
        success: true,
        data: donorResponse
      });

    } catch (error) {
      console.error('Error fetching donor profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch donor profile'
      });
    }
  }

  // Update donor profile
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const updates: DonorProfileUpdate = req.body;

      // Merge preferences if provided
      if (updates.preferences) {
        const currentDonor = await prisma.donor.findUnique({
          where: { id: req.user.id },
          select: { preferences: true }
        });

        updates.preferences = {
          ...currentDonor?.preferences as any,
          ...updates.preferences
        };
      }

      const updatedDonor = await prisma.donor.update({
        where: { id: req.user.id },
        data: updates,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          preferences: true,
          verified: true,
          memberSince: true,
          totalDonated: true,
          studentsSupported: true,
          impactScore: true
        }
      });

      const donorResponse: DonorResponse = {
        id: updatedDonor.id,
        email: updatedDonor.email,
        firstName: updatedDonor.firstName,
        lastName: updatedDonor.lastName,
        phone: updatedDonor.phone || undefined,
        address: updatedDonor.address || undefined,
        preferences: updatedDonor.preferences || undefined,
        verified: updatedDonor.verified,
        memberSince: updatedDonor.memberSince,
        totalDonated: Number(updatedDonor.totalDonated),
        studentsSupported: updatedDonor.studentsSupported,
        impactScore: Number(updatedDonor.impactScore),
        lastLogin: new Date(),
        createdAt: new Date()
      };

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: donorResponse
      });

    } catch (error) {
      console.error('Error updating donor profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update donor profile'
      });
    }
  }

  // Get dashboard statistics
  static async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const donorId = req.user.id;
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Execute multiple queries for dashboard stats
      const [
        donorInfo,
        thisMonthDonations,
        lastMonthDonations,
        recurringCount,
        recentDonations,
        supportedStudentsDetails
      ] = await Promise.all([
        // Basic donor info
        prisma.donor.findUnique({
          where: { id: donorId },
          select: {
            totalDonated: true,
            studentsSupported: true,
            impactScore: true,
            memberSince: true
          }
        }),

        // This month donations
        prisma.donation.aggregate({
          where: {
            donorId: donorId,
            status: 'completed',
            donationType: { not: 'registration_fee' },
            createdAt: {
              gte: thisMonth,
              lte: thisMonthEnd
            }
          },
          _sum: { amount: true }
        }),

        // Last month donations
        prisma.donation.aggregate({
          where: {
            donorId: donorId,
            status: 'completed',
            donationType: { not: 'registration_fee' },
            createdAt: {
              gte: lastMonth,
              lt: thisMonth
            }
          },
          _sum: { amount: true }
        }),

        // Recurring donations count
        prisma.recurringDonation.count({
          where: {
            donorId: donorId,
            active: true
          }
        }),

        // Recent donations for activity feed
        prisma.donation.findMany({
          where: {
            donorId: donorId,
            status: 'completed',
            donationType: { not: 'registration_fee' }
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                profilePhoto: true
              }
            }
          }
        }),

        // Students supported with graduation status
        prisma.donation.findMany({
          where: {
            donorId: donorId,
            status: 'completed',
            donationType: { not: 'registration_fee' }
          },
          distinct: ['studentId'],
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                graduationYear: true,
                registrationStatus: true
              }
            }
          }
        })
      ]);

      if (!donorInfo) {
        res.status(404).json({
          success: false,
          message: 'Donor not found'
        });
        return;
      }

      // Calculate metrics
      const thisMonthAmount = Number(thisMonthDonations._sum.amount || 0);
      const lastMonthAmount = Number(lastMonthDonations._sum.amount || 0);
      const percentChange = lastMonthAmount > 0
        ? ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100
        : thisMonthAmount > 0 ? 100 : 0;

      // Count graduated students
      const currentYear = new Date().getFullYear();
      const graduatedStudents = supportedStudentsDetails.filter(d =>
        parseInt(d.student.graduationYear || '0') <= currentYear &&
        d.student.registrationStatus === 'completed'
      ).length;

      // Calculate items funded
      const itemsFunded = await prisma.donationItem.count({
        where: {
          donation: {
            donorId: donorId,
            status: 'completed',
            donationType: { not: 'registration_fee' }
          }
        }
      });

      // Community rank calculation
      const allDonorTotals = await prisma.donor.findMany({
        select: { totalDonated: true },
        orderBy: { totalDonated: 'desc' }
      });

      const donorRank = allDonorTotals.findIndex(d =>
        Number(d.totalDonated) <= Number(donorInfo.totalDonated)
      ) + 1;

      const totalDonors = allDonorTotals.length;
      const percentile = totalDonors > 0 ? ((totalDonors - donorRank + 1) / totalDonors) * 100 : 0;

      let communityRank = 'New Donor';
      if (percentile >= 90) communityRank = 'Top 10%';
      else if (percentile >= 75) communityRank = 'Top 25%';
      else if (percentile >= 50) communityRank = 'Top 50%';

      const dashboardStats: DonorDashboardStats = {
        overview: {
          totalDonated: Number(donorInfo.totalDonated),
          studentsSupported: donorInfo.studentsSupported,
          recurringDonations: recurringCount,
          impactScore: Number(donorInfo.impactScore)
        },
        monthlyStats: {
          thisMonth: thisMonthAmount,
          lastMonth: lastMonthAmount,
          percentChange: Math.round(percentChange * 100) / 100
        },
        impactMetrics: {
          studentsHelped: donorInfo.studentsSupported,
          studentsGraduated: graduatedStudents,
          itemsFunded: itemsFunded,
          communityRank: communityRank
        },
        recentActivity: recentDonations.map(donation => ({
          id: donation.id,
          amount: Number(donation.amount),
          studentName: `${donation.student.firstName} ${donation.student.lastName}`,
          studentPhoto: donation.student.profilePhoto || undefined, // Convert null to undefined
          date: donation.createdAt,
          message: donation.donorMessage || undefined // Convert null to undefined
        }))
      };

      res.json({
        success: true,
        data: dashboardStats
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics'
      });
    }
  }

  // Get students for discovery
  static async getStudents(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const {
        page = 1,
        limit = 20,
        search,
        school,
        major,
        location,
        graduationYear,
        urgency,
        fundingGoalMin,
        fundingGoalMax,
        sortBy = 'recent',
        verified
      }: StudentDiscoveryQuery = req.query as any;

      const offset = (Number(page) - 1) * Number(limit);

      // Build where clause
      const where: any = {
        isActive: true,
        publicProfile: true,
        verified: true,
        AND: []
      };

      console.log('🔍 [DonorController] Query filters:', {
        isActive: true,
        publicProfile: true,
        verified: true,
        search,
        school,
        major,
        location,
        graduationYear,
        urgency
      });

      // Search across multiple fields
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { schoolName: { contains: search, mode: 'insensitive' } },
          { major: { contains: search, mode: 'insensitive' } },
          { bio: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Apply filters
      if (school) where.AND.push({ schoolName: { contains: school, mode: 'insensitive' } });
      if (major) where.AND.push({ major: { contains: major, mode: 'insensitive' } });
      if (location) where.AND.push({ location: { contains: location, mode: 'insensitive' } });
      if (graduationYear) where.AND.push({ graduationYear });
      if (urgency) where.AND.push({ urgency });
      if (verified !== undefined) where.AND.push({ verified: Boolean(verified) });

      // Funding goal range
      if (fundingGoalMin || fundingGoalMax) {
        const fundingGoalFilter: any = {};
        if (fundingGoalMin) fundingGoalFilter.gte = Number(fundingGoalMin);
        if (fundingGoalMax) fundingGoalFilter.lte = Number(fundingGoalMax);
        where.AND.push({ fundingGoal: fundingGoalFilter });
      }

      // Remove empty AND array
      if (where.AND.length === 0) delete where.AND;

      // Build order by clause
      let orderBy: any;
      switch (sortBy) {
        case 'recent':
          orderBy = { lastActive: 'desc' };
          break;
        case 'name':
          orderBy = { firstName: 'asc' };
          break;
        case 'goal-asc':
          orderBy = { fundingGoal: 'asc' };
          break;
        case 'goal-desc':
          orderBy = { fundingGoal: 'desc' };
          break;
        case 'progress':
          orderBy = [
            { amountRaised: 'desc' },
            { fundingGoal: 'asc' }
          ];
          break;
        default:
          orderBy = { lastActive: 'desc' };
      }

      // Execute queries
      const [students, total, filterOptions] = await Promise.all([
        // Get students
        prisma.student.findMany({
          where,
          orderBy,
          skip: offset,
          take: Number(limit),
          select: {
            id: true,
            firstName: true,
            lastName: true,
            schoolName: true,
            major: true,
            graduationYear: true,
            bio: true,
            fundingGoal: true,
            amountRaised: true,
            profilePhoto: true,
            location: true,
            verified: true,
            tags: true,
            urgency: true,
            lastActive: true,
            profileUrl: true,
            totalDonations: true,
            createdAt: true
          }
        }),

        // Get total count
        prisma.student.count({ where }),

        // Get filter options
        prisma.student.groupBy({
          by: ['schoolName', 'major', 'location'],
          where: { isActive: true, publicProfile: true },
          _count: true
        })
      ]);

      console.log('🔍 [DonorController] Query results:', {
        studentsFound: students.length,
        totalStudents: total,
        verifiedStudents: students.filter(s => s.verified).length,
        unverifiedStudents: students.filter(s => !s.verified).length
      });

      // Process filter options
      const schools = [...new Set(filterOptions.map(item => item.schoolName))].filter(Boolean).sort();
      const majors = [...new Set(filterOptions.map(item => item.major))].filter(Boolean).sort();
      const locations = [...new Set(filterOptions.map(item => item.location))].filter(Boolean).sort();

      // Calculate progress percentage for each student
      const studentsWithProgress: StudentForDonor[] = students.map(student => ({
        ...student,
        school: student.schoolName,
        major: student.major || undefined, // Convert null to undefined
        graduationYear: student.graduationYear || undefined, // Convert null to undefined
        bio: student.bio || undefined, // Convert null to undefined
        profilePhoto: student.profilePhoto || undefined, // Convert null to undefined
        location: student.location || undefined, // Convert null to undefined
        fundingGoal: Number(student.fundingGoal),
        amountRaised: Number(student.amountRaised),
        progressPercentage: Number(student.fundingGoal) > 0
          ? Math.round((Number(student.amountRaised) / Number(student.fundingGoal)) * 100)
          : 0
      }));

      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        success: true,
        data: {
          students: studentsWithProgress,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages,
            hasNext: Number(page) < totalPages,
            hasPrev: Number(page) > 1
          },
          filters: {
            schools,
            majors,
            locations
          }
        }
      });

    } catch (error) {
      console.error('Error in student discovery:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch students'
      });
    }
  }

  // Get specific student details
  static async getStudentDetails(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const { studentId } = req.params;

      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          isActive: true,
          publicProfile: true
        },
        include: {
          registries: {
            where: { fundedStatus: { in: ['needed', 'partial'] } },
            orderBy: { priority: 'desc' },
            take: 5,
            select: {
              id: true,
              itemName: true,
              itemDescription: true,
              price: true,
              category: true,
              priority: true,
              amountFunded: true,
              imageUrl: true
            }
          },
          donations: {
            where: {
              status: 'completed',
              allowPublicDisplay: true
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
              id: true,
              amount: true,
              donorFirstName: true,
              donorLastName: true,
              isAnonymous: true,
              donorMessage: true,
              createdAt: true
            }
          },
          updates: {
            where: { published: true },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
              id: true,
              title: true,
              content: true,
              imageUrl: true,
              updateType: true,
              createdAt: true
            }
          }
        }
      });

      if (!student) {
        res.status(404).json({
          success: false,
          message: 'Student not found or not publicly available'
        });
        return;
      }

      // Calculate statistics
      const donorEmailCount = await prisma.donation.findMany({
        where: {
          studentId: student.id,
          status: 'completed'
        },
        select: { donorEmail: true },
        distinct: ['donorEmail']
      });

      const stats = {
        donorCount: donorEmailCount.length,
        averageDonation: student.totalDonations > 0
          ? Number(student.amountRaised) / student.totalDonations
          : 0,
        goalProgress: Number(student.fundingGoal) > 0
          ? Math.round((Number(student.amountRaised) / Number(student.fundingGoal)) * 100)
          : 0,
        itemsFunded: await prisma.registry.count({
          where: {
            studentId: student.id,
            fundedStatus: 'funded'
          }
        })
      };

      // Format recent donations for display
      const recentDonations = student.donations.map(donation => ({
        amount: Number(donation.amount),
        donorName: donation.isAnonymous
          ? 'Anonymous'
          : `${donation.donorFirstName || ''} ${donation.donorLastName || ''}`.trim() || 'Anonymous',
        date: donation.createdAt,
        message: donation.donorMessage || undefined // Convert null to undefined
      }));

      const response: StudentDetailForDonor = {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        school: student.schoolName,
        major: student.major || undefined, // Convert null to undefined
        graduationYear: student.graduationYear || undefined, // Convert null to undefined
        bio: student.bio || undefined, // Convert null to undefined
        fundingGoal: Number(student.fundingGoal),
        amountRaised: Number(student.amountRaised),
        profilePhoto: student.profilePhoto || undefined, // Convert null to undefined
        location: student.location || undefined, // Convert null to undefined
        verified: student.verified,
        tags: student.tags,
        urgency: student.urgency,
        lastActive: student.lastActive,
        profileUrl: student.profileUrl,
        totalDonations: student.totalDonations,
        progressPercentage: Number(student.fundingGoal) > 0
          ? Math.round((Number(student.amountRaised) / Number(student.fundingGoal)) * 100)
          : 0,
        stats,
        registries: student.registries.map(registry => ({
          ...registry,
          itemDescription: registry.itemDescription || undefined, // Convert null to undefined
          imageUrl: registry.imageUrl || undefined, // Convert null to undefined
          price: Number(registry.price),
          amountFunded: Number(registry.amountFunded)
        })),
        recentDonations,
        updates: student.updates.map(update => ({
          ...update,
          imageUrl: update.imageUrl || undefined // Convert null to undefined
        }))
      };

      res.json({
        success: true,
        data: response
      });

    } catch (error) {
      console.error('Error fetching student details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch student details'
      });
    }
  }

  // Get bookmarks
  static async getBookmarks(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const bookmarks = await prisma.donorBookmark.findMany({
        where: {
          donorId: req.user.id
        },
        orderBy: {
          bookmarkedAt: 'desc'
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              schoolName: true,
              major: true,
              graduationYear: true,
              bio: true,
              fundingGoal: true,
              amountRaised: true,
              profilePhoto: true,
              location: true,
              verified: true,
              tags: true,
              urgency: true,
              lastActive: true,
              profileUrl: true,
              totalDonations: true,
              isActive: true,
              publicProfile: true
            }
          }
        }
      });

      // Filter out inactive or private students
      const activeBookmarks = bookmarks.filter(bookmark =>
        bookmark.student.isActive && bookmark.student.publicProfile
      );

      // Format response with progress calculation
      const formattedBookmarks = activeBookmarks.map(bookmark => ({
        id: bookmark.id,
        studentId: bookmark.studentId,
        bookmarkedAt: bookmark.bookmarkedAt,
        notes: bookmark.notes,
        student: {
          ...bookmark.student,
          school: bookmark.student.schoolName,
          major: bookmark.student.major || undefined, // Convert null to undefined
          graduationYear: bookmark.student.graduationYear || undefined, // Convert null to undefined
          bio: bookmark.student.bio || undefined, // Convert null to undefined
          profilePhoto: bookmark.student.profilePhoto || undefined, // Convert null to undefined
          location: bookmark.student.location || undefined, // Convert null to undefined
          fundingGoal: Number(bookmark.student.fundingGoal),
          amountRaised: Number(bookmark.student.amountRaised),
          progressPercentage: Number(bookmark.student.fundingGoal) > 0
            ? Math.round((Number(bookmark.student.amountRaised) / Number(bookmark.student.fundingGoal)) * 100)
            : 0
        }
      }));

      res.json({
        success: true,
        data: {
          bookmarks: formattedBookmarks,
          total: formattedBookmarks.length
        }
      });

    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch bookmarked students'
      });
    }
  }

  // Create bookmark
  static async createBookmark(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const { studentId, notes }: DonorBookmarkCreate = req.body;

      // Check if student exists and is publicly available
      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          isActive: true,
          publicProfile: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      });

      if (!student) {
        res.status(404).json({
          success: false,
          message: 'Student not found or not publicly available'
        });
        return;
      }

      // Check if already bookmarked
      const existingBookmark = await prisma.donorBookmark.findUnique({
        where: {
          donorId_studentId: {
            donorId: req.user.id,
            studentId: studentId
          }
        }
      });

      if (existingBookmark) {
        res.status(400).json({
          success: false,
          message: 'Student is already in your bookmarks'
        });
        return;
      }

      // Create bookmark
      const bookmark = await prisma.donorBookmark.create({
        data: {
          donorId: req.user.id,
          studentId: studentId,
          notes: notes || null
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              schoolName: true,
              major: true,
              graduationYear: true,
              bio: true,
              fundingGoal: true,
              amountRaised: true,
              profilePhoto: true,
              location: true,
              verified: true,
              tags: true,
              urgency: true,
              profileUrl: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Student bookmarked successfully',
        data: {
          bookmark: {
            id: bookmark.id,
            studentId: bookmark.studentId,
            bookmarkedAt: bookmark.bookmarkedAt,
            notes: bookmark.notes,
            student: {
              ...bookmark.student,
              school: bookmark.student.schoolName,
              major: bookmark.student.major || undefined, // Convert null to undefined
              graduationYear: bookmark.student.graduationYear || undefined, // Convert null to undefined
              bio: bookmark.student.bio || undefined, // Convert null to undefined
              profilePhoto: bookmark.student.profilePhoto || undefined, // Convert null to undefined
              location: bookmark.student.location || undefined, // Convert null to undefined
              fundingGoal: Number(bookmark.student.fundingGoal),
              amountRaised: Number(bookmark.student.amountRaised),
              progressPercentage: Number(bookmark.student.fundingGoal) > 0
                ? Math.round((Number(bookmark.student.amountRaised) / Number(bookmark.student.fundingGoal)) * 100)
                : 0
            }
          }
        }
      });

    } catch (error) {
      console.error('Error creating bookmark:', error);

      if ((error as any).code === 'P2002') {
        res.status(400).json({
          success: false,
          message: 'Student is already in your bookmarks'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to bookmark student'
      });
    }
  }

  // Update bookmark
  static async updateBookmark(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const { bookmarkId } = req.params;
      const { notes }: DonorBookmarkUpdate = req.body;

      // Check if bookmark exists and belongs to donor
      const existingBookmark = await prisma.donorBookmark.findFirst({
        where: {
          id: bookmarkId,
          donorId: req.user.id
        }
      });

      if (!existingBookmark) {
        res.status(404).json({
          success: false,
          message: 'Bookmark not found'
        });
        return;
      }

      // Update bookmark
      const updatedBookmark = await prisma.donorBookmark.update({
        where: { id: bookmarkId },
        data: { notes },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              schoolName: true,
              major: true,
              graduationYear: true,
              fundingGoal: true,
              amountRaised: true,
              profilePhoto: true,
              verified: true,
              urgency: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Bookmark updated successfully',
        data: {
          bookmark: {
            id: updatedBookmark.id,
            studentId: updatedBookmark.studentId,
            bookmarkedAt: updatedBookmark.bookmarkedAt,
            notes: updatedBookmark.notes,
            student: {
              ...updatedBookmark.student,
              school: updatedBookmark.student.schoolName,
              major: updatedBookmark.student.major || undefined, // Convert null to undefined
              graduationYear: updatedBookmark.student.graduationYear || undefined, // Convert null to undefined
              profilePhoto: updatedBookmark.student.profilePhoto || undefined, // Convert null to undefined
              fundingGoal: Number(updatedBookmark.student.fundingGoal),
              amountRaised: Number(updatedBookmark.student.amountRaised)
            }
          }
        }
      });

    } catch (error) {
      console.error('Error updating bookmark:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update bookmark'
      });
    }
  }

  // Delete bookmark
  static async deleteBookmark(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const { bookmarkId } = req.params;

      // Check if bookmark exists and belongs to donor
      const existingBookmark = await prisma.donorBookmark.findFirst({
        where: {
          id: bookmarkId,
          donorId: req.user.id
        }
      });

      if (!existingBookmark) {
        res.status(404).json({
          success: false,
          message: 'Bookmark not found'
        });
        return;
      }

      // Delete bookmark
      await prisma.donorBookmark.delete({
        where: { id: bookmarkId }
      });

      res.json({
        success: true,
        message: 'Bookmark removed successfully'
      });

    } catch (error) {
      console.error('Error deleting bookmark:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove bookmark'
      });
    }
  }

  // Check bookmark status
  static async checkBookmarkStatus(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const { studentId } = req.params;

      const bookmark = await prisma.donorBookmark.findUnique({
        where: {
          donorId_studentId: {
            donorId: req.user.id,
            studentId: studentId
          }
        },
        select: {
          id: true,
          bookmarkedAt: true
        }
      });

      res.json({
        success: true,
        data: {
          isBookmarked: !!bookmark,
          bookmark: bookmark
        }
      });

    } catch (error) {
      console.error('Error checking bookmark status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check bookmark status'
      });
    }
  }

  // Get donation history
  static async getDonationHistory(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const {
        page = 1,
        limit = 20,
        startDate,
        endDate,
        studentId,
        donationType,
        status,
        recurring,
        sortBy = 'date',
        sortOrder = 'desc'
      }: DonationHistoryQuery = req.query as any;

      const offset = (Number(page) - 1) * Number(limit);

      // Build where clause
      const where: any = {
        donorId: req.user.id,
        AND: []
      };

      // Apply filters
      if (startDate) where.AND.push({ createdAt: { gte: new Date(startDate) } });
      if (endDate) where.AND.push({ createdAt: { lte: new Date(endDate) } });
      if (studentId) where.AND.push({ studentId });
      if (donationType) where.AND.push({ donationType });
      if (status) where.AND.push({ status });
      if (recurring !== undefined) where.AND.push({ isRecurring: Boolean(recurring) });

      // Remove empty AND array
      if (where.AND.length === 0) delete where.AND;

      // Build order by clause
      let orderBy: any;
      switch (sortBy) {
        case 'date':
          orderBy = { createdAt: sortOrder };
          break;
        case 'amount':
          orderBy = { amount: sortOrder };
          break;
        case 'student':
          orderBy = {
            student: {
              firstName: sortOrder
            }
          };
          break;
        default:
          orderBy = { createdAt: 'desc' };
      }

      // Execute queries
      const [donations, total, summary] = await Promise.all([
        // Get donations
        prisma.donation.findMany({
          where,
          orderBy,
          skip: offset,
          take: Number(limit),
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
                schoolName: true,
                profileUrl: true
              }
            },
            targetRegistry: {
              select: {
                id: true,
                itemName: true,
                category: true
              }
            },
            taxReceipt: {
              select: {
                receiptNumber: true,
                receiptPdfUrl: true,
                issued: true
              }
            }
          }
        }),

        // Get total count
        prisma.donation.count({ where }),

        // Get summary statistics
        prisma.donation.aggregate({
          where: { donorId: req.user.id },
          _sum: { amount: true },
          _count: { id: true }
        })
      ]);

      // Count active recurring donations
      const recurringActive = await prisma.recurringDonation.count({
        where: {
          donorId: req.user.id,
          active: true
        }
      });

      // Format donations for response
      const formattedDonations = donations.map(donation => ({
        id: donation.id,
        studentId: donation.studentId,
        studentName: `${donation.student.firstName} ${donation.student.lastName}`,
        studentPhoto: donation.student.profilePhoto || undefined, // Convert null to undefined
        studentSchool: donation.student.schoolName,
        studentProfileUrl: donation.student.profileUrl,
        amount: Number(donation.amount),
        netAmount: Number(donation.netAmount),
        donationType: donation.donationType,
        paymentMethod: donation.paymentMethod,
        status: donation.status,
        recurring: donation.isRecurring,
        message: donation.donorMessage || undefined, // Convert null to undefined
        donatedAt: donation.createdAt,
        processedAt: donation.processedAt,
        taxReceiptNumber: donation.taxReceipt?.receiptNumber || null,
        taxReceiptUrl: donation.taxReceipt?.receiptPdfUrl || null,
        taxReceiptIssued: donation.taxReceipt?.issued || false,
        targetItem: donation.targetRegistry ? {
          id: donation.targetRegistry.id,
          name: donation.targetRegistry.itemName,
          category: donation.targetRegistry.category
        } : null,
        isAnonymous: donation.isAnonymous,
        failureReason: donation.failureReason || undefined, // Convert null to undefined
        refundReason: donation.refundReason || undefined // Convert null to undefined
      }));

      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        success: true,
        data: {
          donations: formattedDonations,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages,
            hasNext: Number(page) < totalPages,
            hasPrev: Number(page) > 1
          },
          summary: {
            totalAmount: Number(summary._sum.amount || 0),
            totalDonations: summary._count.id,
            recurringActive
          }
        }
      });

    } catch (error) {
      console.error('Error fetching donation history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch donation history'
      });
    }
  }

  // Get search suggestions
  static async getSearchSuggestions(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const { q } = req.query;

      if (!q || (q as string).length < 2) {
        res.json({
          success: true,
          data: {
            suggestions: {
              schools: [],
              majors: [],
              locations: []
            }
          }
        });
        return;
      }

      const searchTerm = (q as string).toLowerCase();

      // Get suggestions for schools, majors, and locations
      const [schoolSuggestions, majorSuggestions, locationSuggestions] = await Promise.all([
        prisma.student.findMany({
          where: {
            isActive: true,
            publicProfile: true,
            schoolName: { contains: searchTerm, mode: 'insensitive' }
          },
          select: { schoolName: true },
          distinct: ['schoolName'],
          take: 10
        }),

        prisma.student.findMany({
          where: {
            isActive: true,
            publicProfile: true,
            major: { contains: searchTerm, mode: 'insensitive' }
          },
          select: { major: true },
          distinct: ['major'],
          take: 10
        }),

        prisma.student.findMany({
          where: {
            isActive: true,
            publicProfile: true,
            location: { contains: searchTerm, mode: 'insensitive' }
          },
          select: { location: true },
          distinct: ['location'],
          take: 10
        })
      ]);

      res.json({
        success: true,
        data: {
          suggestions: {
            schools: schoolSuggestions.map(s => s.schoolName).filter(Boolean),
            majors: majorSuggestions.map(m => m.major).filter(Boolean),
            locations: locationSuggestions.map(l => l.location).filter(Boolean)
          }
        }
      });

    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch search suggestions'
      });
    }
  }

  // Create a recurring donation
  static async createRecurringDonation(req: Request, res: Response): Promise<void> {
    try {
      const { studentId, amount, frequency, paymentMethodId } = req.body;
      if (!studentId || !amount || !frequency || !paymentMethodId) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }
      const recurring = await prisma.recurringDonation.create({
        data: {
          donor: {
            connect: { id: req.user.id }
          },
          student: {
            connect: { id: studentId }
          },
          amount: Number(amount),
          frequency,
          active: true,
          nextPaymentDate: new Date(), // For demo, set to now
          paymentMethodId: 'default' // This should be replaced with actual payment method ID
        },
      });
      res.status(201).json({ success: true, data: recurring });
    } catch (error) {
      console.error('Error creating recurring donation:', error);
      res.status(500).json({ success: false, message: 'Failed to create recurring donation' });
    }
  }

  // List all recurring donations for the donor
  static async listRecurringDonations(req: Request, res: Response): Promise<void> {
    try {
      const recurring = await prisma.recurringDonation.findMany({
        where: { donorId: req.user.id },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: recurring });
    } catch (error) {
      console.error('Error listing recurring donations:', error);
      res.status(500).json({ success: false, message: 'Failed to list recurring donations' });
    }
  }

  // Update (pause/cancel) a recurring donation
  static async updateRecurringDonation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { active, cancelledAt } = req.body;
      const updated = await prisma.recurringDonation.update({
        where: { id },
        data: {
          ...(active !== undefined && { active }),
          ...(cancelledAt && { cancelledAt: new Date(cancelledAt) }),
        },
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating recurring donation:', error);
      res.status(500).json({ success: false, message: 'Failed to update recurring donation' });
    }
  }

  // Public student directory
  static async getPublicStudents(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        school,
        major,
        location,
        graduationYear,
        urgency,
        fundingGoalMin,
        fundingGoalMax,
        sortBy = 'recent',
        verified
      }: StudentDiscoveryQuery = req.query as any;

      const offset = (Number(page) - 1) * Number(limit);

      // Build where clause
      const where: any = {
        isActive: true,
        publicProfile: true,
        verified: true,
        AND: []
      };

      console.log('🔍 [DonorController] Query filters:', {
        isActive: true,
        publicProfile: true,
        verified: true,
        search,
        school,
        major,
        location,
        graduationYear,
        urgency
      });

      // Search across multiple fields
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { schoolName: { contains: search, mode: 'insensitive' } },
          { major: { contains: search, mode: 'insensitive' } },
          { bio: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Apply filters
      if (school) where.AND.push({ schoolName: { contains: school, mode: 'insensitive' } });
      if (major) where.AND.push({ major: { contains: major, mode: 'insensitive' } });
      if (location) where.AND.push({ location: { contains: location, mode: 'insensitive' } });
      if (graduationYear) where.AND.push({ graduationYear });
      if (urgency) where.AND.push({ urgency });
      if (verified !== undefined) where.AND.push({ verified: Boolean(verified) });

      // Funding goal range
      if (fundingGoalMin || fundingGoalMax) {
        const fundingGoalFilter: any = {};
        if (fundingGoalMin) fundingGoalFilter.gte = Number(fundingGoalMin);
        if (fundingGoalMax) fundingGoalFilter.lte = Number(fundingGoalMax);
        where.AND.push({ fundingGoal: fundingGoalFilter });
      }

      // Remove empty AND array
      if (where.AND.length === 0) delete where.AND;

      // Build order by clause
      let orderBy: any;
      switch (sortBy) {
        case 'recent':
          orderBy = { lastActive: 'desc' };
          break;
        case 'name':
          orderBy = { firstName: 'asc' };
          break;
        case 'goal-asc':
          orderBy = { fundingGoal: 'asc' };
          break;
        case 'goal-desc':
          orderBy = { fundingGoal: 'desc' };
          break;
        case 'progress':
          orderBy = [
            { amountRaised: 'desc' },
            { fundingGoal: 'asc' }
          ];
          break;
        default:
          orderBy = { lastActive: 'desc' };
      }

      // Execute queries
      const [students, total, filterOptions] = await Promise.all([
        // Get students
        prisma.student.findMany({
          where,
          orderBy,
          skip: offset,
          take: Number(limit),
          select: {
            id: true,
            firstName: true,
            lastName: true,
            schoolName: true,
            major: true,
            graduationYear: true,
            bio: true,
            fundingGoal: true,
            amountRaised: true,
            profilePhoto: true,
            location: true,
            verified: true,
            tags: true,
            urgency: true,
            lastActive: true,
            profileUrl: true,
            totalDonations: true,
            createdAt: true
          }
        }),

        // Get total count
        prisma.student.count({ where }),

        // Get filter options
        prisma.student.groupBy({
          by: ['schoolName', 'major', 'location'],
          where: { isActive: true, publicProfile: true },
          _count: true
        })
      ]);

      console.log('🔍 [DonorController] Query results:', {
        studentsFound: students.length,
        totalStudents: total,
        verifiedStudents: students.filter(s => s.verified).length,
        unverifiedStudents: students.filter(s => !s.verified).length
      });

      // Process filter options
      const schools = [...new Set(filterOptions.map(item => item.schoolName))].filter(Boolean).sort();
      const majors = [...new Set(filterOptions.map(item => item.major))].filter(Boolean).sort();
      const locations = [...new Set(filterOptions.map(item => item.location))].filter(Boolean).sort();

      // Calculate progress percentage for each student
      const studentsWithProgress = students.map(student => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        school: student.schoolName,
        major: student.major || undefined,
        graduationYear: student.graduationYear || undefined,
        bio: student.bio || undefined,
        profilePhoto: student.profilePhoto || undefined,
        location: student.location || undefined,
        fundingGoal: Number(student.fundingGoal),
        amountRaised: Number(student.amountRaised),
        verified: student.verified,
        tags: student.tags,
        urgency: student.urgency,
        lastActive: student.lastActive,
        profileUrl: student.profileUrl,
        totalDonations: student.totalDonations,
        progressPercentage: Number(student.fundingGoal) > 0
          ? Math.round((Number(student.amountRaised) / Number(student.fundingGoal)) * 100)
          : 0
      }));

      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        success: true,
        data: {
          students: studentsWithProgress,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages,
            hasNext: Number(page) < totalPages,
            hasPrev: Number(page) > 1
          },
          filters: {
            schools,
            majors,
            locations
          }
        }
      });

    } catch (error) {
      console.error('Error in public student directory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch students'
      });
    }
  }

  // Get public student details
  static async getPublicStudentDetails(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;

      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          isActive: true,
          publicProfile: true
        },
        include: {
          registries: {
            where: { fundedStatus: { in: ['needed', 'partial'] } },
            orderBy: { priority: 'desc' },
            take: 5,
            select: {
              id: true,
              itemName: true,
              itemDescription: true,
              price: true,
              category: true,
              priority: true,
              amountFunded: true,
              imageUrl: true
            }
          },
          donations: {
            where: {
              status: 'completed',
              allowPublicDisplay: true
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
              id: true,
              amount: true,
              donorFirstName: true,
              donorLastName: true,
              isAnonymous: true,
              donorMessage: true,
              createdAt: true
            }
          },
          updates: {
            where: { published: true },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
              id: true,
              title: true,
              content: true,
              imageUrl: true,
              updateType: true,
              createdAt: true
            }
          }
        }
      });

      if (!student) {
        res.status(404).json({
          success: false,
          message: 'Student not found or not publicly available'
        });
        return;
      }

      // Calculate statistics
      const donorEmailCount = await prisma.donation.findMany({
        where: {
          studentId: student.id,
          status: 'completed'
        },
        select: { donorEmail: true },
        distinct: ['donorEmail']
      });

      const stats = {
        donorCount: donorEmailCount.length,
        averageDonation: student.totalDonations > 0
          ? Number(student.amountRaised) / student.totalDonations
          : 0,
        goalProgress: Number(student.fundingGoal) > 0
          ? Math.round((Number(student.amountRaised) / Number(student.fundingGoal)) * 100)
          : 0,
        itemsFunded: await prisma.registry.count({
          where: {
            studentId: student.id,
            fundedStatus: 'funded'
          }
        })
      };

      // Format recent donations for display
      const recentDonations = student.donations.map(donation => ({
        amount: Number(donation.amount),
        donorName: donation.isAnonymous
          ? 'Anonymous'
          : `${donation.donorFirstName || ''} ${donation.donorLastName || ''}`.trim() || 'Anonymous',
        date: donation.createdAt,
        message: donation.donorMessage || undefined
      }));

      const response = {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        school: student.schoolName,
        major: student.major || undefined,
        graduationYear: student.graduationYear || undefined,
        bio: student.bio || undefined,
        fundingGoal: Number(student.fundingGoal),
        amountRaised: Number(student.amountRaised),
        profilePhoto: student.profilePhoto || undefined,
        location: student.location || undefined,
        verified: student.verified,
        tags: student.tags,
        urgency: student.urgency,
        lastActive: student.lastActive,
        profileUrl: student.profileUrl,
        totalDonations: student.totalDonations,
        progressPercentage: Number(student.fundingGoal) > 0
          ? Math.round((Number(student.amountRaised) / Number(student.fundingGoal)) * 100)
          : 0,
        stats,
        registries: student.registries.map(registry => ({
          ...registry,
          itemDescription: registry.itemDescription || undefined,
          imageUrl: registry.imageUrl || undefined,
          price: Number(registry.price),
          amountFunded: Number(registry.amountFunded)
        })),
        recentDonations,
        updates: student.updates.map(update => ({
          ...update,
          imageUrl: update.imageUrl || undefined
        }))
      };

      res.json({
        success: true,
        data: response
      });

    } catch (error) {
      console.error('Error fetching public student details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch student details'
      });
    }
  }

  // Get available items for sponsorship
  static async getAvailableItems(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        studentId,
        category,
        minPrice,
        maxPrice,
        sortBy = 'priority'
      } = req.query as any;

      const offset = (Number(page) - 1) * Number(limit);

      // Build where clause
      const where: any = {
        fundedStatus: { in: ['needed', 'partial'] },
        AND: []
      };

      if (studentId) where.AND.push({ studentId });
      if (category) where.AND.push({ category });
      if (minPrice || maxPrice) {
        const priceFilter: any = {};
        if (minPrice) priceFilter.gte = Number(minPrice);
        if (maxPrice) priceFilter.lte = Number(maxPrice);
        where.AND.push({ price: priceFilter });
      }

      // Remove empty AND array
      if (where.AND.length === 0) delete where.AND;

      // Build order by clause
      let orderBy: any;
      switch (sortBy) {
        case 'priority':
          orderBy = { priority: 'desc' };
          break;
        case 'price-asc':
          orderBy = { price: 'asc' };
          break;
        case 'price-desc':
          orderBy = { price: 'desc' };
          break;
        case 'recent':
          orderBy = { createdAt: 'desc' };
          break;
        default:
          orderBy = { priority: 'desc' };
      }

      // Execute queries
      const [items, total] = await Promise.all([
        prisma.registry.findMany({
          where,
          orderBy,
          skip: offset,
          take: Number(limit),
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                schoolName: true,
                profilePhoto: true
              }
            }
          }
        }),
        prisma.registry.count({ where })
      ]);

      // Format items for response
      const formattedItems = items.map(item => ({
        id: item.id,
        itemName: item.itemName,
        itemDescription: item.itemDescription || undefined,
        price: Number(item.price),
        category: item.category,
        priority: item.priority,
        amountFunded: Number(item.amountFunded),
        imageUrl: item.imageUrl || undefined,
        student: {
          id: item.student.id,
          name: `${item.student.firstName} ${item.student.lastName}`,
          school: item.student.schoolName,
          photo: item.student.profilePhoto || undefined
        },
        fundingProgress: Number(item.price) > 0
          ? Math.round((Number(item.amountFunded) / Number(item.price)) * 100)
          : 0
      }));

      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        success: true,
        data: {
          items: formattedItems,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages,
            hasNext: Number(page) < totalPages,
            hasPrev: Number(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Error fetching available items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available items'
      });
    }
  }

  // Sponsor an item
  static async sponsorItem(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const { itemId, amount, message } = req.body;

      // Get item details
      const item = await prisma.registry.findUnique({
        where: { id: itemId },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Item not found'
        });
        return;
      }

      // Check if item is still available for sponsorship
      if (item.fundedStatus === 'funded') {
        res.status(400).json({
          success: false,
          message: 'This item has already been fully funded'
        });
        return;
      }

      // Check if amount is valid
      const remainingAmount = Number(item.price) - Number(item.amountFunded);
      if (Number(amount) <= 0 || Number(amount) > remainingAmount) {
        res.status(400).json({
          success: false,
          message: `Invalid amount. Remaining amount to fund: $${remainingAmount}`
        });
        return;
      }

      // Create donation
      const donation = await prisma.donation.create({
        data: {
          donorId: req.user.user.id,
          studentId: item.student.id,
          amount: Number(amount),
          donationType: 'item',
          targetRegistryId: item.id,
          donorMessage: message || null,
          status: 'pending',
          donorEmail: req.user.email,
          paymentMethod: 'credit_card', // Default payment method
          transactionFee: 0, // Will be calculated by payment processor
          netAmount: Number(amount) // Will be adjusted after fee calculation
        }
      });

      // Update item funding status
      const newAmountFunded = Number(item.amountFunded) + Number(amount);
      const fundedStatus = newAmountFunded >= Number(item.price) ? 'funded' : 'partial';

      await prisma.registry.update({
        where: { id: itemId },
        data: {
          amountFunded: newAmountFunded,
          fundedStatus
        }
      });

      // Send notification to student
      // TODO: Implement notification system

      res.status(201).json({
        success: true,
        message: 'Item sponsorship successful',
        data: {
          donation: {
            id: donation.id,
            amount: Number(donation.amount),
            status: donation.status,
            createdAt: donation.createdAt
          },
          item: {
            id: item.id,
            itemName: item.itemName,
            amountFunded: newAmountFunded,
            fundedStatus
          }
        }
      });

    } catch (error) {
      console.error('Error sponsoring item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sponsor item'
      });
    }
  }

  // Get sponsored items
  static async getSponsoredItems(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const {
        page = 1,
        limit = 20,
        status
      } = req.query as any;

      const offset = (Number(page) - 1) * Number(limit);

      // Build where clause
      const where: any = {
        donations: {
          some: {
            donorId: req.user.user.id,
            donationType: 'item'
          }
        }
      };

      if (status) {
        where.fundedStatus = status;
      }

      // Execute queries
      const [items, total] = await Promise.all([
        prisma.registry.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: offset,
          take: Number(limit),
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                schoolName: true,
                profilePhoto: true
              }
            },
            donations: {
              where: {
                donorId: req.user.user.id,
                donationType: 'item'
              },
              select: {
                id: true,
                amount: true,
                createdAt: true,
                status: true
              }
            }
          }
        }),
        prisma.registry.count({ where })
      ]);

      // Format items for response
      const formattedItems = items.map(item => ({
        id: item.id,
        itemName: item.itemName,
        itemDescription: item.itemDescription || undefined,
        price: Number(item.price),
        category: item.category,
        amountFunded: Number(item.amountFunded),
        imageUrl: item.imageUrl || undefined,
        fundedStatus: item.fundedStatus,
        student: {
          id: item.student.id,
          name: `${item.student.firstName} ${item.student.lastName}`,
          school: item.student.schoolName,
          photo: item.student.profilePhoto || undefined
        },
        yourDonations: item.donations.map(donation => ({
          id: donation.id,
          amount: Number(donation.amount),
          date: donation.createdAt,
          status: donation.status
        })),
        fundingProgress: Number(item.price) > 0
          ? Math.round((Number(item.amountFunded) / Number(item.price)) * 100)
          : 0
      }));

      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        success: true,
        data: {
          items: formattedItems,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages,
            hasNext: Number(page) < totalPages,
            hasPrev: Number(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Error fetching sponsored items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sponsored items'
      });
    }
  }

  // Request password reset
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const donor = await prisma.donor.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!donor) {
        // Don't reveal if email exists or not
        res.json({
          success: true,
          message: 'If an account exists with this email, you will receive password reset instructions.'
        });
        return;
      }

      // Generate reset token
      const resetToken = JWTUtils.generateToken({
        userId: donor.id,
        email: donor.email,
        userType: 'donor',
        purpose: 'password_reset'
      } as any);

      // TODO: Send password reset email with token
      // For now, just return the token
      res.json({
        success: true,
        message: 'Password reset instructions sent to your email',
        data: { resetToken }
      });

    } catch (error) {
      console.error('Error requesting password reset:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request'
      });
    }
  }

  // Reset password
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      // Verify token
      const decoded = JWTUtils.verifyToken(token);
      if (!decoded || (decoded as any).purpose !== 'password_reset') {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
        return;
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.donor.update({
        where: { id: decoded.id },
        data: { passwordHash }
      });

      res.json({
        success: true,
        message: 'Password reset successful'
      });

    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password'
      });
    }
  }

  // Request email verification
  static async requestEmailVerification(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const donor = await prisma.donor.findUnique({
        where: { id: req.user.id }
      });

      if (!donor) {
        res.status(404).json({
          success: false,
          message: 'Donor not found'
        });
        return;
      }

      if (donor.verified) {
        res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
        return;
      }

      // Generate verification token
      const verificationToken = JWTUtils.generateToken({
        userId: donor.id,
        email: donor.email,
        userType: 'donor',
        purpose: 'email_verification'
      } as any);

      // TODO: Send verification email with token
      // For now, just return the token
      res.json({
        success: true,
        message: 'Verification email sent',
        data: { verificationToken }
      });

    } catch (error) {
      console.error('Error requesting email verification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }
  }

  // Verify email
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      // Verify token
      const decoded = JWTUtils.verifyToken(token);
      if (!decoded || (decoded as any).purpose !== 'email_verification') {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token'
        });
        return;
      }

      // Update verification status
      await prisma.donor.update({
        where: { id: decoded.id },
        data: { verified: true }
      });

      res.json({
        success: true,
        message: 'Email verified successfully'
      });

    } catch (error) {
      console.error('Error verifying email:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify email'
      });
    }
  }

  // Delete account
  static async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const { password } = req.body;

      // Verify password
      const donor = await prisma.donor.findUnique({
        where: { id: req.user.id }
      });

      if (!donor) {
        res.status(404).json({
          success: false,
          message: 'Donor not found'
        });
        return;
      }

      const isValidPassword = await bcrypt.compare(password, donor.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
        return;
      }

      // Delete account
      await prisma.donor.delete({
        where: { id: req.user.id }
      });

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account'
      });
    }
  }

  // Update notification preferences
  static async updateNotificationPreferences(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const { preferences } = req.body;

      // Update preferences
      const updatedDonor = await prisma.donor.update({
        where: { id: req.user.id },
        data: {
          preferences: {
            ...preferences
          }
        },
        select: {
          preferences: true
        }
      });

      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: {
          preferences: updatedDonor.preferences
        }
      });

    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences'
      });
    }
  }

  // Export donation history
  static async exportDonationHistory(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const { format = 'csv', startDate, endDate } = req.query as any;

      // Build where clause
      const where: any = {
        donorId: req.user.id,
        status: 'completed'
      };

      if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
      if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

      // Get donations
      const donations = await prisma.donation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              schoolName: true
            }
          },
          taxReceipt: {
            select: {
              receiptNumber: true,
              receiptPdfUrl: true
            }
          }
        }
      });

      // Format data based on requested format
      let formattedData: string;
      let contentType: string;
      let filename: string;

      if (format === 'csv') {
        // Format as CSV
        const headers = ['Date', 'Amount', 'Student', 'School', 'Receipt Number', 'Receipt URL'];
        const rows = donations.map(d => [
          d.createdAt.toISOString(),
          d.amount.toString(),
          `${d.student.firstName} ${d.student.lastName}`,
          d.student.schoolName,
          d.taxReceipt?.receiptNumber || '',
          d.taxReceipt?.receiptPdfUrl || ''
        ]);

        formattedData = [
          headers.join(','),
          ...rows.map(row => row.join(','))
        ].join('\n');

        contentType = 'text/csv';
        filename = 'donation_history.csv';
      } else {
        // Format as JSON
        formattedData = JSON.stringify(donations, null, 2);
        contentType = 'application/json';
        filename = 'donation_history.json';
      }

      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      res.send(formattedData);

    } catch (error) {
      console.error('Error exporting donation history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export donation history'
      });
    }
  }

  // Bookmark a student
  static async bookmarkStudent(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const { studentId } = req.body;

      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });

      if (!student) {
        res.status(404).json({
          success: false,
          message: 'Student not found'
        });
        return;
      }

      // Check if already bookmarked
      const existingBookmark = await prisma.donorBookmark.findFirst({
        where: {
          donorId: req.user.id,
          studentId: studentId
        }
      });

      if (existingBookmark) {
        res.status(400).json({
          success: false,
          message: 'Student is already bookmarked'
        });
        return;
      }

      // Create bookmark
      const bookmark = await prisma.donorBookmark.create({
        data: {
          donorId: req.user.id,
          studentId: studentId
        }
      });

      res.status(201).json({
        success: true,
        message: 'Student bookmarked successfully',
        data: {
          bookmarkId: bookmark.id
        }
      });

    } catch (error) {
      console.error('Error bookmarking student:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bookmark student'
      });
    }
  }

  // Remove a bookmark
  static async removeBookmark(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const { bookmarkId } = req.params;

      // Check if bookmark exists and belongs to donor
      const bookmark = await prisma.donorBookmark.findFirst({
        where: {
          id: bookmarkId,
          donorId: req.user.id
        }
      });

      if (!bookmark) {
        res.status(404).json({
          success: false,
          message: 'Bookmark not found'
        });
        return;
      }

      // Delete bookmark
      await prisma.donorBookmark.delete({
        where: { id: bookmarkId }
      });

      res.json({
        success: true,
        message: 'Bookmark removed successfully'
      });

    } catch (error) {
      console.error('Error removing bookmark:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove bookmark'
      });
    }
  }

  // Setup recurring donation
  static async setupRecurringDonation(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.userType !== 'donor') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Donor account required.'
        });
        return;
      }

      const { studentId, amount, frequency, startDate } = req.body;

      // Validate frequency
      if (!['weekly', 'monthly', 'quarterly', 'yearly'].includes(frequency)) {
        res.status(400).json({
          success: false,
          message: 'Invalid frequency. Must be weekly, monthly, quarterly, or yearly'
        });
        return;
      }

      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });

      if (!student) {
        res.status(404).json({
          success: false,
          message: 'Student not found'
        });
        return;
      }

      // Calculate next donation date
      const nextDonationDate = new Date(startDate || new Date());
      switch (frequency) {
        case 'weekly':
          nextDonationDate.setDate(nextDonationDate.getDate() + 7);
          break;
        case 'monthly':
          nextDonationDate.setMonth(nextDonationDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDonationDate.setMonth(nextDonationDate.getMonth() + 3);
          break;
        case 'yearly':
          nextDonationDate.setFullYear(nextDonationDate.getFullYear() + 1);
          break;
      }

      // Create recurring donation
      const recurringDonation = await prisma.recurringDonation.create({
        data: {
          donor: {
            connect: { id: req.user.id }
          },
          student: {
            connect: { id: studentId }
          },
          amount: Number(amount),
          frequency,
          active: true,
          nextPaymentDate: nextDonationDate,
          paymentMethodId: 'default' // This should be replaced with actual payment method ID
        }
      });

      res.status(201).json({
        success: true,
        message: 'Recurring donation setup successful',
        data: {
          recurringDonationId: recurringDonation.id,
          nextPaymentDate: recurringDonation.nextPaymentDate
        }
      });

    } catch (error) {
      console.error('Error setting up recurring donation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to setup recurring donation'
      });
    }
  }
}