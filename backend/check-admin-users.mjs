import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminUsers() {
  console.log('🔍 Checking admin users in database...\n');

  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        userType: true
      }
    });

    if (admins.length === 0) {
      console.log('❌ No admin users found in database');
      console.log('\n💡 To create an admin user:');
      console.log('1. Run: node scripts/create-admin.js');
      console.log('2. Or use the admin creation script');
    } else {
      console.log(`✅ Found ${admins.length} admin user(s):`);
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.firstName} ${admin.lastName}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   User Type: ${admin.userType || 'admin'}`);
        console.log(`   ID: ${admin.id}`);
        console.log('');
      });

      console.log('🔑 To login as admin:');
      console.log('1. Go to the frontend');
      console.log('2. Click the logo 7 times to access admin portal');
      console.log('3. Use one of the admin emails above');
      console.log('4. Enter the password (check create-admin.js for default)');
    }

  } catch (error) {
    console.error('❌ Error checking admin users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUsers(); 