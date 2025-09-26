// scripts/backfill-donor-ids.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const donations = await prisma.donation.findMany({
    where: { donorId: null },
    select: { id: true, donorEmail: true }
  });

  for (const donation of donations) {
    if (!donation.donorEmail) continue;
    const donor = await prisma.donor.findUnique({
      where: { email: donation.donorEmail }
    });
    if (donor) {
      await prisma.donation.update({
        where: { id: donation.id },
        data: { donorId: donor.id }
      });
      console.log(`Updated donation ${donation.id} with donorId ${donor.id}`);
    } else {
      console.log(`No donor found for donation ${donation.id} (email: ${donation.donorEmail})`);
    }
  }
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
