// backend/src/types/donor.ts
export interface DonorRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface DonorProfileUpdate {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences?: {
    emailNotifications?: boolean;
    publicProfile?: boolean;
    preferredDonationAmount?: number;
  };
}

export interface StudentDiscoveryQuery {
  page?: number;
  limit?: number;
  search?: string;
  school?: string;
  major?: string;
  location?: string;
  graduationYear?: string;
  urgency?: 'high' | 'medium' | 'low';
  fundingGoalMin?: number;
  fundingGoalMax?: number;
  sortBy?: 'recent' | 'name' | 'goal-asc' | 'goal-desc' | 'progress';
  verified?: boolean;
}

export interface DonorBookmarkCreate {
  studentId: string;
  notes?: string;
}

export interface DonorBookmarkUpdate {
  notes?: string;
}

export interface DonationHistoryQuery {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  studentId?: string;
  donationType?: 'general' | 'item' | 'emergency';
  status?: 'completed' | 'pending' | 'failed' | 'refunded';
  recurring?: boolean;
  sortBy?: 'date' | 'amount' | 'student';
  sortOrder?: 'asc' | 'desc';
}

export interface DonorDashboardStats {
  overview: {
    totalDonated: number;
    studentsSupported: number;
    recurringDonations: number;
    impactScore: number;
  };
  monthlyStats: {
    thisMonth: number;
    lastMonth: number;
    percentChange: number;
  };
  impactMetrics: {
    studentsHelped: number;
    studentsGraduated: number;
    itemsFunded: number;
    communityRank: string;
  };
  recentActivity: Array<{
    id: string;
    amount: number;
    studentName: string;
    studentPhoto?: string;
    date: Date;
    message?: string;
  }>;
}

export interface StudentForDonor {
  id: string;
  firstName: string;
  lastName: string;
  school: string;
  major?: string;
  graduationYear?: string;
  bio?: string;
  fundingGoal: number;
  amountRaised: number;
  profilePhoto?: string;
  location?: string;
  verified: boolean;
  tags: string[];
  urgency: string;
  lastActive: Date;
  profileUrl: string;
  totalDonations: number;
  progressPercentage: number;
}

export interface StudentDetailForDonor extends StudentForDonor {
  stats: {
    donorCount: number;
    averageDonation: number;
    goalProgress: number;
    itemsFunded: number;
  };
  registries: Array<{
    id: string;
    itemName: string;
    itemDescription?: string;
    price: number;
    category: string;
    priority: string;
    amountFunded: number;
    imageUrl?: string;
  }>;
  recentDonations: Array<{
    amount: number;
    donorName: string;
    date: Date;
    message?: string;
  }>;
  updates: Array<{
    id: string;
    title: string;
    content: string;
    imageUrl?: string;
    updateType: string;
    createdAt: Date;
  }>;
}

export interface DonorResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: any;
  preferences?: any;
  verified: boolean;
  memberSince: Date;
  totalDonated: number;
  studentsSupported: number;
  impactScore: number;
  lastLogin?: Date;
  createdAt: Date;
}