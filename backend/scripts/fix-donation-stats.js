// scripts/fix-donor-stats.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const donors = await prisma.donor.findMany({ select: { id: true, email: true } });

  for (const donor of donors) {
    // Get all completed, real donations for this donor
    const donations = await prisma.donation.findMany({
      where: {
        donorId: donor.id,
        status: 'completed',
        donationType: { not: 'registration_fee' }
      },
      select: { amount: true, studentId: true }
    });

    const totalDonated = donations.reduce((sum, d) => sum + Number(d.amount), 0);
    const studentsSupported = new Set(donations.map(d => d.studentId)).size;

    await prisma.donor.update({
      where: { id: donor.id },
      data: {
        totalDonated,
        studentsSupported
      }
    });

    console.log(
      `Updated donor ${donor.email}: totalDonated=$${totalDonated}, studentsSupported=${studentsSupported}`
    );
  }
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
