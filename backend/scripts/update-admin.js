"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function updateExistingAdmin() {
    try {
        console.log('Checking existing admin account...');
        // Find the existing admin
        const existingAdmin = await prisma.admin.findUnique({
            where: { email: 'admin@village.com' }
        });
        if (!existingAdmin) {
            console.log('❌ No admin found with email admin@village.com');
            return;
        }
        console.log('📧 Found admin:', existingAdmin.email);
        console.log('🔑 Current role:', existingAdmin.role);
        console.log('✅ Verified status:', existingAdmin.verified);
        // Update the admin to have super_admin role and verified status
        const updatedAdmin = await prisma.admin.update({
            where: { email: 'admin@village.com' },
            data: {
                role: 'super_admin',
                verified: true,
                isActive: true
            }
        });
        console.log('✅ Admin updated successfully!');
        console.log('📧 Email:', updatedAdmin.email);
        console.log('🔑 Role:', updatedAdmin.role);
        console.log('✅ Verified:', updatedAdmin.verified);
        console.log('⚠️  You can now login with this admin account');
    }
    catch (error) {
        console.error('❌ Error updating admin:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
updateExistingAdmin();
//# sourceMappingURL=update-admin.js.map