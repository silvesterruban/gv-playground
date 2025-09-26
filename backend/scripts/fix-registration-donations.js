const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndFixRegistrationDonations() {
  try {
    console.log('🔍 Checking registration donations...');

    // Find all registration_fee donations
    const registrationDonations = await prisma.donation.findMany({
      where: {
        donationType: 'registration_fee'
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            amountRaised: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${registrationDonations.length} registration fee donations:`);
    
    for (const donation of registrationDonations) {
      console.log(`\n💰 Registration Donation ID: ${donation.id}`);
      console.log(`   Student: ${donation.student.firstName} ${donation.student.lastName} (${donation.student.email})`);
      console.log(`   Amount: $${donation.amount}`);
      console.log(`   Status: ${donation.status}`);
      console.log(`   Created: ${donation.createdAt}`);
      console.log(`   Student Amount Raised: $${donation.student.amountRaised}`);
    }

    // Find all actual donations (non-registration)
    const actualDonations = await prisma.donation.findMany({
      where: {
        donationType: {
          not: 'registration_fee'
        },
        status: 'completed'
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            amountRaised: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n📊 Found ${actualDonations.length} actual donations (non-registration):`);
    
    for (const donation of actualDonations) {
      console.log(`\n💝 Actual Donation ID: ${donation.id}`);
      console.log(`   Student: ${donation.student.firstName} ${donation.student.lastName} (${donation.student.email})`);
      console.log(`   Amount: $${donation.amount}`);
      console.log(`   Net Amount: $${donation.netAmount}`);
      console.log(`   Donation Type: ${donation.donationType}`);
      console.log(`   Status: ${donation.status}`);
      console.log(`   Created: ${donation.createdAt}`);
      console.log(`   Student Amount Raised: $${donation.student.amountRaised}`);
    }

    // Check if any students have incorrect amountRaised due to registration fees
    const studentsWithRegistrationFees = await prisma.student.findMany({
      where: {
        donations: {
          some: {
            donationType: 'registration_fee',
            status: 'completed'
          }
        }
      },
      include: {
        donations: {
          where: {
            donationType: {
              not: 'registration_fee'
            },
            status: 'completed'
          }
        }
      }
    });

    console.log(`\n🔍 Checking ${studentsWithRegistrationFees.length} students with registration fees...`);

    for (const student of studentsWithRegistrationFees) {
      const actualDonationsTotal = student.donations.reduce((sum, donation) => {
        return sum + Number(donation.netAmount || donation.amount);
      }, 0);

      const currentAmountRaised = Number(student.amountRaised || 0);
      
      console.log(`\n👤 Student: ${student.firstName} ${student.lastName} (${student.email})`);
      console.log(`   Current Amount Raised: $${currentAmountRaised.toFixed(2)}`);
      console.log(`   Actual Donations Total: $${actualDonationsTotal.toFixed(2)}`);
      console.log(`   Actual Donations Count: ${student.donations.length}`);

      if (Math.abs(currentAmountRaised - actualDonationsTotal) > 0.01) {
        console.log(`   ⚠️  DISCREPANCY DETECTED!`);
        console.log(`   🔧 Fixing amount raised...`);
        
        await prisma.student.update({
          where: { id: student.id },
          data: {
            amountRaised: actualDonationsTotal
          }
        });

        console.log(`   ✅ Amount raised updated to $${actualDonationsTotal.toFixed(2)}`);
      } else {
        console.log(`   ✅ Amount raised is correct!`);
      }
    }

    console.log(`\n✅ Registration donation check completed!`);

  } catch (error) {
    console.error('❌ Error checking registration donations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkAndFixRegistrationDonations(); 