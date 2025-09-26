// backend/scripts/create-test-student.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestStudent() {
  try {
    console.log('🔍 Creating test student...');

    const testEmail = 'teststudent@example.com';
    const testPassword = 'TestPassword123!';

    // Check if student already exists
    const existingStudent = await prisma.student.findUnique({
      where: { email: testEmail }
    });

    if (existingStudent) {
      console.log('✅ Test student already exists:');
      console.log(`   ID: ${existingStudent.id}`);
      console.log(`   Email: ${existingStudent.email}`);
      console.log(`   Name: ${existingStudent.firstName} ${existingStudent.lastName}`);
      return existingStudent;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(testPassword, 12);

    // Create test student
    const student = await prisma.student.create({
      data: {
        email: testEmail,
        passwordHash,
        firstName: 'Test',
        lastName: 'Student',
        schoolName: 'Test University',
        major: 'Computer Science',
        bio: 'Test student for donation testing',
        profileUrl: `test-student-${Date.now()}`,
        fundingGoal: 500000, // $5,000 in cents
        amountRaised: 0,
        graduationYear: '2025',
        location: 'Test City, CA',
        verified: true, // Set as verified for testing
        publicProfile: true,
        userId: `user-${Date.now()}`, // Required field
        welcomeBoxStatus: 'pending'
      }
    });

    console.log('✅ Test student created successfully:');
    console.log(`   ID: ${student.id}`);
    console.log(`   Email: ${student.email}`);
    console.log(`   Name: ${student.firstName} ${student.lastName}`);
    console.log(`   School: ${student.schoolName}`);
    console.log(`   Funding Goal: $${(Number(student.fundingGoal) / 100).toFixed(2)}`);

    return student;

  } catch (error) {
    console.error('❌ Error creating test student:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  createTestStudent()
    .then(() => {
      console.log('🎉 Test student setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test student setup failed:', error);
      process.exit(1);
    });
}

export { createTestStudent };