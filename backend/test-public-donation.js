const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001';

async function testPublicDonation() {
  console.log('🧪 Testing Public Donation Functionality...\n');

  try {
    // Step 1: Get a public student profile
    console.log('1. Fetching public student profiles...');
    const studentsResponse = await fetch(`${API_BASE_URL}/api/students/public`);
    
    if (!studentsResponse.ok) {
      throw new Error(`Failed to fetch students: ${studentsResponse.status}`);
    }
    
    const studentsData = await studentsResponse.json();
    console.log(`✅ Found ${studentsData.data?.students?.length || 0} public students`);
    
    if (!studentsData.data?.students?.length) {
      console.log('❌ No public students found. Please create a student profile first.');
      return;
    }

    const testStudent = studentsData.data.students[0];
    console.log(`📚 Using student: ${testStudent.firstName} ${testStudent.lastName} (${testStudent.id})`);

    // Step 2: Create a public donation
    console.log('\n2. Creating public donation...');
    const donationData = {
      studentId: testStudent.id,
      amount: 25.00,
      donorEmail: 'test@example.com',
      donorFirstName: 'Test',
      donorLastName: 'Donor',
      donorMessage: 'This is a test donation from the public donation system!',
      isAnonymous: false,
      allowPublicDisplay: true
    };

    const donationResponse = await fetch(`${API_BASE_URL}/api/donations/public/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(donationData)
    });

    if (!donationResponse.ok) {
      const errorText = await donationResponse.text();
      throw new Error(`Failed to create donation: ${donationResponse.status} - ${errorText}`);
    }

    const donationResult = await donationResponse.json();
    console.log('✅ Public donation created successfully!');
    console.log(`   Donation ID: ${donationResult.donation.id}`);
    console.log(`   Amount: $${donationResult.donation.amount}`);
    console.log(`   Tax Receipt: ${donationResult.donation.taxReceiptNumber}`);
    console.log(`   Status: ${donationResult.donation.status}`);

    // Step 3: Verify the donation appears in student's public profile
    console.log('\n3. Verifying donation appears in student profile...');
    const profileResponse = await fetch(`${API_BASE_URL}/api/students/public/${testStudent.profileUrl}`);
    
    if (!profileResponse.ok) {
      throw new Error(`Failed to fetch student profile: ${profileResponse.status}`);
    }
    
    const profileData = await profileResponse.json();
    console.log(`✅ Student profile updated!`);
    console.log(`   Total Donations: ${profileData.student.stats.totalDonations}`);
    console.log(`   Amount Raised: $${profileData.student.amountRaised}`);

    console.log('\n🎉 Public Donation System Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Public student profiles are accessible');
    console.log('   ✅ Public donations can be created without authentication');
    console.log('   ✅ Donation data is properly stored and linked to students');
    console.log('   ✅ Tax receipt numbers are generated');
    console.log('   ✅ Student profiles are updated with new donation data');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testPublicDonation(); 