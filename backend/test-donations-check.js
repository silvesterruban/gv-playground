const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDonations() {
  console.log('🔍 Checking donations in database...\n');

  try {
    // Check total donations
    const totalDonations = await prisma.donation.count();
    console.log(`📊 Total donations in database: ${totalDonations}`);

    if (totalDonations === 0) {
      console.log('❌ No donations found in database');
      console.log('\n🔍 Checking recent donation attempts...');
      
      // Check if there are any recent donation records
      const recentDonations = await prisma.donation.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      });

      if (recentDonations.length === 0) {
        console.log('❌ No recent donations found');
        console.log('\n💡 Possible issues:');
        console.log('1. Public donation form not working');
        console.log('2. Database connection issues');
        console.log('3. Donation creation failing');
        console.log('4. Backend server not running');
      } else {
        console.log('✅ Found recent donations:');
        recentDonations.forEach((donation, index) => {
          console.log(`${index + 1}. ${donation.donorFirstName} ${donation.donorLastName}`);
          console.log(`   Amount: $${donation.amount}`);
          console.log(`   Status: ${donation.status}`);
          console.log(`   Date: ${donation.createdAt}`);
          console.log(`   Student: ${donation.student?.firstName} ${donation.student?.lastName}`);
          console.log('');
        });
      }
    } else {
      console.log('✅ Found donations!');
      
      // Get recent donations
      const recentDonations = await prisma.donation.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      });

      console.log('\n📋 Recent donations:');
      recentDonations.forEach((donation, index) => {
        console.log(`${index + 1}. ${donation.donorFirstName} ${donation.donorLastName}`);
        console.log(`   Amount: $${donation.amount}`);
        console.log(`   Status: ${donation.status}`);
        console.log(`   Date: ${donation.createdAt}`);
        console.log(`   Student: ${donation.student?.firstName} ${donation.student?.lastName}`);
        console.log(`   Payment Method: ${donation.paymentMethod}`);
        console.log(`   Public Donation: ${donation.isPublicDonation ? 'Yes' : 'No'}`);
        console.log('');
      });

      // Check donation status distribution
      const statusCounts = await prisma.donation.groupBy({
        by: ['status'],
        _count: true
      });

      console.log('📊 Donation status distribution:');
      statusCounts.forEach(status => {
        console.log(`   ${status.status}: ${status._count}`);
      });

      // Check public vs private donations
      const publicDonations = await prisma.donation.count({
        where: { isPublicDonation: true }
      });

      const privateDonations = await prisma.donation.count({
        where: { isPublicDonation: false }
      });

      console.log(`\n📊 Public donations: ${publicDonations}`);
      console.log(`📊 Private donations: ${privateDonations}`);
    }

    // Test admin donation endpoint
    console.log('\n🔍 Testing admin donation endpoint...');
    
    // First, get an admin token (you'll need to create this)
    console.log('⚠️  Note: Admin endpoint requires authentication');
    console.log('   To test manually:');
    console.log('   1. Login as admin');
    console.log('   2. Visit: http://localhost:3001/api/donation-admin/donations');
    console.log('   3. Include Authorization header with admin token');

  } catch (error) {
    console.error('❌ Error checking donations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkDonations(); 