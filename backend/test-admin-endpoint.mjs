import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';

const API_BASE_URL = 'http://localhost:3001';

async function testAdminEndpoint() {
  console.log('🔍 Testing admin donation endpoint...\n');

  try {
    // Test 1: Check if endpoint exists (without auth)
    console.log('1. Testing endpoint without authentication...');
    const response1 = await fetch(`${API_BASE_URL}/api/donation-admin/donations`);
    console.log(`   Status: ${response1.status}`);
    
    if (response1.status === 401) {
      console.log('   ✅ Endpoint exists but requires authentication (expected)');
    } else if (response1.status === 404) {
      console.log('   ❌ Endpoint not found');
      return;
    } else {
      console.log('   ⚠️  Unexpected response');
    }

    // Test 2: Check if we can get a sample donation directly from database
    console.log('\n2. Testing direct database access...');
    const prisma = new PrismaClient();
    
    const sampleDonation = await prisma.donation.findFirst({
      include: {
        student: {
          select: { firstName: true, lastName: true, email: true, schoolName: true }
        }
      }
    });

    if (sampleDonation) {
      console.log('   ✅ Found sample donation in database:');
      console.log(`   - ID: ${sampleDonation.id}`);
      console.log(`   - Amount: $${sampleDonation.amount}`);
      console.log(`   - Status: ${sampleDonation.status}`);
      console.log(`   - Student: ${sampleDonation.student?.firstName} ${sampleDonation.student?.lastName}`);
      console.log(`   - Date: ${sampleDonation.createdAt}`);
    } else {
      console.log('   ❌ No donations found in database');
    }

    await prisma.$disconnect();

    // Test 3: Check if admin routes are properly registered
    console.log('\n3. Checking if admin routes are registered...');
    const routesResponse = await fetch(`${API_BASE_URL}/api/routes`);
    
    if (routesResponse.ok) {
      const routes = await routesResponse.json();
      const adminRoutes = routes.filter((route) => route.includes('donation-admin'));
      
      if (adminRoutes.length > 0) {
        console.log('   ✅ Admin routes are registered:');
        adminRoutes.forEach((route) => console.log(`   - ${route}`));
      } else {
        console.log('   ❌ No admin routes found');
      }
    } else {
      console.log('   ⚠️  Could not check routes endpoint');
    }

    // Test 4: Provide instructions for manual testing
    console.log('\n4. Manual testing instructions:');
    console.log('   To test the admin dashboard:');
    console.log('   1. Login as admin in the frontend');
    console.log('   2. Go to Admin Dashboard → Donations');
    console.log('   3. Check browser console for any errors');
    console.log('   4. Verify the admin token is being sent');
    console.log('\n   To test the API directly:');
    console.log('   1. Get an admin token from the frontend');
    console.log('   2. Use curl or Postman:');
    console.log(`   curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" ${API_BASE_URL}/api/donation-admin/donations`);

  } catch (error) {
    console.error('❌ Error testing admin endpoint:', error);
  }
}

// Run the test
testAdminEndpoint(); 