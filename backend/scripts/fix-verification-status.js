const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixVerificationStatus() {
  try {
    console.log('🔧 Fixing verification status for students...');
    
    // Find all students who are verified but shouldn't be
    const students = await prisma.student.findMany({
      where: {
        verified: true,
        // Only unverify students who haven't been manually verified by admin
        verifiedBy: null
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        verified: true,
        verifiedBy: true,
        verifiedAt: true
      }
    });

    console.log(`📊 Found ${students.length} students with incorrect verification status:`);
    
    for (const student of students) {
      console.log(`  - ${student.firstName} ${student.lastName} (${student.email})`);
    }

    if (students.length > 0) {
      // Update all these students to be unverified
      const result = await prisma.student.updateMany({
        where: {
          verified: true,
          verifiedBy: null
        },
        data: {
          verified: false,
          verifiedAt: null
        }
      });

      console.log(`✅ Updated ${result.count} students to unverified status`);
    } else {
      console.log('✅ No students found with incorrect verification status');
    }

    // Show current verification status
    const verifiedCount = await prisma.student.count({
      where: { verified: true }
    });

    const totalCount = await prisma.student.count();

    console.log(`\n📈 Current verification status:`);
    console.log(`  - Total students: ${totalCount}`);
    console.log(`  - Verified students: ${verifiedCount}`);
    console.log(`  - Unverified students: ${totalCount - verifiedCount}`);

  } catch (error) {
    console.error('❌ Error fixing verification status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixVerificationStatus(); 