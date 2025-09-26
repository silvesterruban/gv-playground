"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/scripts/setup-schools.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function setupSchools() {
    try {
        console.log('🏫 Setting up schools for verification system...');
        const schools = [
            {
                name: 'Harvard University',
                domain: 'harvard.edu',
                verificationMethods: ['email', 'id_card', 'transcript']
            },
            {
                name: 'Stanford University',
                domain: 'stanford.edu',
                verificationMethods: ['email', 'id_card', 'transcript']
            },
            {
                name: 'Massachusetts Institute of Technology',
                domain: 'mit.edu',
                verificationMethods: ['email', 'id_card', 'transcript']
            },
            {
                name: 'University of California, Berkeley',
                domain: 'berkeley.edu',
                verificationMethods: ['email', 'id_card', 'transcript']
            },
            {
                name: 'Columbia University',
                domain: 'columbia.edu',
                verificationMethods: ['email', 'id_card', 'transcript']
            },
            {
                name: 'Yale University',
                domain: 'yale.edu',
                verificationMethods: ['email', 'id_card', 'transcript']
            },
            {
                name: 'Princeton University',
                domain: 'princeton.edu',
                verificationMethods: ['email', 'id_card', 'transcript']
            },
            {
                name: 'University of Chicago',
                domain: 'uchicago.edu',
                verificationMethods: ['email', 'id_card', 'transcript']
            },
            {
                name: 'New York University',
                domain: 'nyu.edu',
                verificationMethods: ['email', 'id_card', 'transcript', 'document']
            },
            {
                name: 'University of Pennsylvania',
                domain: 'upenn.edu',
                verificationMethods: ['email', 'id_card', 'transcript']
            }
        ];
        for (const school of schools) {
            try {
                const existingSchool = await prisma.school.findUnique({
                    where: { name: school.name }
                });
                if (existingSchool) {
                    console.log(`📚 ${school.name} already exists, updating...`);
                    await prisma.school.update({
                        where: { id: existingSchool.id },
                        data: {
                            domain: school.domain,
                            verificationMethods: school.verificationMethods
                        }
                    });
                }
                else {
                    console.log(`📚 Creating ${school.name}...`);
                    await prisma.school.create({
                        data: school
                    });
                }
            }
            catch (error) {
                console.error(`❌ Error creating ${school.name}:`, error);
            }
        }
        console.log('🎉 Schools setup completed!');
        console.log('💡 Students can now select from these schools when verifying their status.');
        // Show current schools count
        const schoolCount = await prisma.school.count();
        console.log(`📊 Total schools in database: ${schoolCount}`);
    }
    catch (error) {
        console.error('❌ Error setting up schools:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
setupSchools();
//# sourceMappingURL=setup-schools.js.map