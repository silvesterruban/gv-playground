"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/scripts/create-test-verifications.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function createTestVerifications() {
    try {
        console.log('🧪 Creating test verification data...');
        // First, get some existing students and schools
        const students = await prisma.student.findMany({
            take: 3, // Get first 3 students
            select: { id: true, firstName: true, lastName: true, email: true }
        });
        const schools = await prisma.school.findMany({
            take: 2, // Get first 2 schools
            select: { id: true, name: true }
        });
        if (students.length === 0) {
            console.log('❌ No students found. Please create some students first.');
            return;
        }
        if (schools.length === 0) {
            console.log('❌ No schools found. Creating a test school...');
            // Create a test school
            const testSchool = await prisma.school.create({
                data: {
                    name: 'Test University',
                    domain: 'test.edu',
                    verificationMethods: ['email', 'id_card', 'transcript']
                }
            });
            schools.push(testSchool);
        }
        // Create test verifications
        const testVerifications = [
            {
                studentId: students[0].id,
                schoolId: schools[0].id,
                verificationMethod: 'email',
                verificationEmail: `${students[0].firstName.toLowerCase()}.${students[0].lastName.toLowerCase()}@${schools[0].name.toLowerCase().replace(' ', '')}.edu`,
                status: 'pending'
            },
            {
                studentId: students[1]?.id || students[0].id,
                schoolId: schools[0].id,
                verificationMethod: 'id_card',
                verificationDocument: 'https://example.com/student-id-card.jpg',
                status: 'pending'
            }
        ];
        // Add a third verification if we have enough students
        if (students.length > 2) {
            testVerifications.push({
                studentId: students[2].id,
                schoolId: schools[1]?.id || schools[0].id,
                verificationMethod: 'transcript',
                verificationDocument: 'https://example.com/transcript.pdf',
                status: 'pending'
            });
        }
        // Create the verifications
        for (const verification of testVerifications) {
            await prisma.schoolVerification.create({
                data: verification
            });
            console.log(`✅ Created verification for student ${verification.studentId} using ${verification.verificationMethod}`);
        }
        console.log(`🎉 Successfully created ${testVerifications.length} test verifications!`);
        console.log('💡 Go to your admin dashboard → Verification tab to see them.');
    }
    catch (error) {
        console.error('❌ Error creating test verifications:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the script
createTestVerifications();
//# sourceMappingURL=create-test-verifications.js.map