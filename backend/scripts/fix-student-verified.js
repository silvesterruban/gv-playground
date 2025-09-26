// backend/scripts/fix-student-verified.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find all students who are marked as verified but have no admin approval
  const students = await prisma.student.findMany({
    where: {
      verified: true,
      OR: [
        { verifiedBy: null },
        { verifiedAt: null }
      ]
    },
    select: { id: true, email: true }
  });

  for (const student of students) {
    await prisma.student.update({
      where: { id: student.id },
      data: { verified: false, verifiedAt: null, verifiedBy: null }
    });
    console.log(`Set verified=false for student: ${student.email}`);
  }

  console.log('Backfill complete!');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 