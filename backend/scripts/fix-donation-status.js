const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndFixDonationStatus() {
  try {
    console.log('🔍 Checking donation status issues...');

    // Find all donations for the student
    const donations = await prisma.donation.findMany({
      where: {
        studentId: '29ef9a33-79c1-4751-b00c-1bff16b13aa0' // tr1@gmail.com student ID
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

    console.log(`📊 Found ${donations.length} donations for student:`);
    
    let totalDonations = 0;
    let totalAmountRaised = 0;
    let pendingDonations = 0;
    let completedDonations = 0;
    let failedDonations = 0;

    for (const donation of donations) {
      console.log(`\n💰 Donation ID: ${donation.id}`);
      console.log(`   Status: ${donation.status}`);
      console.log(`   Amount: $${donation.amount}`);
      console.log(`   Net Amount: $${donation.netAmount}`);
      console.log(`   Payment Method: ${donation.paymentMethod}`);
      console.log(`   Created: ${donation.createdAt}`);
      console.log(`   Processed: ${donation.processedAt || 'Not processed'}`);
      console.log(`   Failure Reason: ${donation.failureReason || 'None'}`);

      totalDonations++;
      
      if (donation.status === 'completed') {
        completedDonations++;
        totalAmountRaised += Number(donation.netAmount || donation.amount);
      } else if (donation.status === 'pending') {
        pendingDonations++;
      } else if (donation.status === 'failed') {
        failedDonations++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Total Donations: ${totalDonations}`);
    console.log(`   Completed: ${completedDonations}`);
    console.log(`   Pending: ${pendingDonations}`);
    console.log(`   Failed: ${failedDonations}`);
    console.log(`   Expected Amount Raised: $${totalAmountRaised.toFixed(2)}`);
    console.log(`   Current Amount Raised: $${donations[0]?.student?.amountRaised || 0}`);

    // Check if there's a discrepancy
    const currentAmountRaised = Number(donations[0]?.student?.amountRaised || 0);
    if (Math.abs(totalAmountRaised - currentAmountRaised) > 0.01) {
      console.log(`\n⚠️  DISCREPANCY DETECTED!`);
      console.log(`   Expected: $${totalAmountRaised.toFixed(2)}`);
      console.log(`   Current: $${currentAmountRaised.toFixed(2)}`);
      console.log(`   Difference: $${(totalAmountRaised - currentAmountRaised).toFixed(2)}`);

      // Fix the amount raised
      console.log(`\n🔧 Fixing amount raised...`);
      await prisma.student.update({
        where: { id: '29ef9a33-79c1-4751-b00c-1bff16b13aa0' },
        data: {
          amountRaised: totalAmountRaised
        }
      });

      console.log(`✅ Amount raised updated to $${totalAmountRaised.toFixed(2)}`);
    } else {
      console.log(`\n✅ Amount raised is correct!`);
    }

    // Check for pending donations that should be processed
    const pendingDonationsList = donations.filter(d => d.status === 'pending');
    if (pendingDonationsList.length > 0) {
      console.log(`\n⚠️  Found ${pendingDonationsList.length} pending donations:`);
      for (const pending of pendingDonationsList) {
        console.log(`   - ID: ${pending.id}, Amount: $${pending.amount}, Created: ${pending.createdAt}`);
        
        // If it's been more than 24 hours, mark as failed
        const hoursSinceCreation = (Date.now() - new Date(pending.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation > 24) {
          console.log(`   ⏰ Marking as failed (older than 24 hours)`);
          await prisma.donation.update({
            where: { id: pending.id },
            data: {
              status: 'failed',
              failureReason: 'Payment timeout - older than 24 hours'
            }
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking donation status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkAndFixDonationStatus(); 