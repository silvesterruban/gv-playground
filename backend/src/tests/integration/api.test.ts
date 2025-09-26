import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('GradVillage API Integration Tests', () => {
  let testStudentToken: string;
  let testDonorToken: string;
  let testAdminToken: string;
  let testStudentId: string;
  let testDonorId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.donation.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.donor.deleteMany({});
    await prisma.admin.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/register/student - Should register a new student', async () => {
      const studentData = {
        email: 'test.student@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'Student',
        school: 'Test University',
        major: 'Computer Science'
      };

      const response = await request(app)
        .post('/api/auth/register/student')
        .send(studentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(studentData.email);
      expect(response.body.user.userType).toBe('student');
      expect(response.body).toHaveProperty('token');

      testStudentToken = response.body.token;
      testStudentId = response.body.user.id;
    });

    test('POST /api/auth/register/donor - Should register a new donor', async () => {
      const donorData = {
        email: 'test.donor@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'Donor'
      };

      const response = await request(app)
        .post('/api/auth/register/donor')
        .send(donorData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(donorData.email);
      expect(response.body.user.userType).toBe('donor');
      expect(response.body).toHaveProperty('token');

      testDonorToken = response.body.token;
      testDonorId = response.body.user.id;
    });

    test('POST /api/auth/login - Should login with valid credentials', async () => {
      const loginData = {
        email: 'test.student@example.com',
        password: 'TestPassword123!',
        userType: 'student'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(loginData.email);
    });

    test('GET /api/auth/me - Should get current user info', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testStudentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('test.student@example.com');
    });
  });

  describe('Student Profile Endpoints', () => {
    test('GET /api/students/profile - Should get student profile', async () => {
      const response = await request(app)
        .get('/api/students/profile')
        .set('Authorization', `Bearer ${testStudentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('firstName');
      expect(response.body.data).toHaveProperty('lastName');
      expect(response.body.data).toHaveProperty('school');
    });

    test('PUT /api/students/profile - Should update student profile', async () => {
      const updateData = {
        bio: 'Updated bio for testing',
        fundingGoal: 5000,
        graduationYear: 2025
      };

      const response = await request(app)
        .put('/api/students/profile')
        .set('Authorization', `Bearer ${testStudentToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bio).toBe(updateData.bio);
      expect(response.body.data.fundingGoal).toBe(updateData.fundingGoal);
    });
  });

  describe('Donor Endpoints', () => {
    test('GET /api/donors/students - Should get list of students', async () => {
      const response = await request(app)
        .get('/api/donors/students')
        .set('Authorization', `Bearer ${testDonorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.students)).toBe(true);
    });

    test('GET /api/donors/students/:studentId - Should get specific student', async () => {
      const response = await request(app)
        .get(`/api/donors/students/${testStudentId}`)
        .set('Authorization', `Bearer ${testDonorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.student).toHaveProperty('id');
      expect(response.body.student.id).toBe(testStudentId);
    });
  });

  describe('Donation Endpoints', () => {
    test('POST /api/donations/create - Should create a donation', async () => {
      const donationData = {
        studentId: testStudentId,
        amount: 100,
        donationType: 'general',
        paymentMethod: 'stripe',
        isAnonymous: false
      };

      const response = await request(app)
        .post('/api/donations/create')
        .set('Authorization', `Bearer ${testDonorToken}`)
        .send(donationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.donation).toHaveProperty('id');
      expect(response.body.donation.amount).toBe(donationData.amount);
    });

    test('GET /api/donations/history - Should get donation history', async () => {
      const response = await request(app)
        .get('/api/donations/history')
        .set('Authorization', `Bearer ${testDonorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.donations)).toBe(true);
    });
  });

  describe('Public Endpoints', () => {
    test('GET /api/students/public/:profileUrl - Should get public profile', async () => {
      // First, update student to have a profile URL
      await request(app)
        .put('/api/students/profile')
        .set('Authorization', `Bearer ${testStudentToken}`)
        .send({ profileUrl: 'test-student' });

      const response = await request(app)
        .get('/api/students/public/test-student')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.student).toHaveProperty('firstName');
      expect(response.body.student).toHaveProperty('lastName');
    });
  });

  describe('Verification-Based Filtering', () => {
    test('GET /api/donors/students - Should only return verified students', async () => {
      const response = await request(app)
        .get('/api/donors/students')
        .set('Authorization', `Bearer ${testDonorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.students)).toBe(true);
      
      // All returned students should be verified
      const allVerified = response.body.data.students.every((student: any) => student.verified === true);
      expect(allVerified).toBe(true);
      
      console.log(`✅ Found ${response.body.data.students.length} verified students in browse list`);
    });

    test('GET /api/students/public/:profileUrl - Should not return unverified students', async () => {
      // This test assumes the student is not verified
      const response = await request(app)
        .get('/api/students/public/test-student')
        .expect(404); // Should return 404 for unverified students

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Profile not found');
    });
  });

  describe('Health Check', () => {
    test('GET /health - Should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('Rate Limiting', () => {
    test('Should enforce rate limits on auth endpoints', async () => {
      const authData = {
        email: 'rate.limit@test.com',
        password: 'TestPassword123!',
        userType: 'student'
      };

      // Make multiple requests to trigger rate limit
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(authData);
      }

      // The 6th request should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send(authData)
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Too many authentication attempts');
    });
  });

  describe('Error Handling', () => {
    test('Should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid JSON format');
    });

    test('Should handle missing authentication', async () => {
      const response = await request(app)
        .get('/api/students/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authentication required');
    });

    test('Should handle invalid token', async () => {
      const response = await request(app)
        .get('/api/students/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid token');
    });
  });
}); 