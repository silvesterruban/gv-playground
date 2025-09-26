import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');

  try {
    // 1. Seed Schools
    console.log('🏫 Seeding schools...');
    const schools = [
      { name: 'Harvard University' },
      { name: 'Stanford University' },
      { name: 'MIT' },
      { name: 'Yale University' },
      { name: 'Princeton University' },
      { name: 'Columbia University' },
      { name: 'University of California Berkeley' },
      { name: 'University of Michigan' },
      { name: 'University of Pennsylvania' },
      { name: 'Duke University' },
      { name: 'Test University' }
    ];

    for (const school of schools) {
      await prisma.school.upsert({
        where: { name: school.name },
        update: {},
        create: school
      });
    }
    console.log(`✅ ${schools.length} schools seeded`);

    // 2. Seed Admin Account
    console.log('👑 Seeding admin account...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await prisma.admin.upsert({
      where: { email: 'admin@village.com' },
      update: {},
      create: {
        email: 'admin@village.com',
        passwordHash: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true
      }
    });
    console.log('✅ Admin account seeded');

    // Note: Categories and Payment Methods are not part of the current schema
    console.log('📚 Skipping categories (not in schema)');
    console.log('💳 Skipping payment methods (not in schema)');

    // 5. Seed Sample Student (for testing)
    console.log('👨‍🎓 Seeding sample student...');
    const studentPassword = await bcrypt.hash('student123', 10);
    await prisma.student.upsert({
      where: { email: 'student@example.com' },
      update: {},
      create: {
        userId: uuidv4(),
        email: 'student@example.com',
        passwordHash: studentPassword,
        firstName: 'Sarah',
        lastName: 'Johnson',
        schoolName: 'MIT',
        major: 'Computer Science',
        bio: 'First-generation college student pursuing AI research.',
        profileUrl: 'sarah-johnson',
        fundingGoal: 3000,
        registrationPaid: true,
        registrationStatus: 'verified',
      },
    });
    console.log('✅ Sample student seeded');

    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📋 Seeded Data Summary:');
    console.log(`   🏫 Schools: ${schools.length}`);
    console.log('   👑 Admin Account: 1');
    console.log('   📚 Categories: 0 (not in schema)');
    console.log('   💳 Payment Methods: 0 (not in schema)');
    console.log('   👨‍🎓 Sample Student: 1');
    console.log('');
    console.log('🔑 Admin Login:');
    console.log('   Email: admin@village.com');
    console.log('   Password: admin123');
    console.log('');
    console.log('👨‍🎓 Sample Student Login:');
    console.log('   Email: student@example.com');
    console.log('   Password: student123');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding script failed:', error);
      process.exit(1);
    });
}

module.exports = { main };
