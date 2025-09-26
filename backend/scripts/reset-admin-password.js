"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function resetAdminPassword() {
    try {
        console.log('Resetting admin password...');
        // Check if admin exists
        const existingAdmin = await prisma.admin.findUnique({
            where: { email: 'admin@village.com' }
        });
        if (!existingAdmin) {
            console.log('❌ No admin found with email admin@village.com');
            return;
        }
        console.log('📧 Found admin:', existingAdmin.email);
        // Hash the new password
        const newPassword = 'AdminPassword123!';
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
        // Update the admin password
        const updatedAdmin = await prisma.admin.update({
            where: { email: 'admin@village.com' },
            data: {
                passwordHash: passwordHash,
                role: 'super_admin',
                verified: true,
                isActive: true
            }
        });
        console.log('✅ Admin password reset successfully!');
        console.log('📧 Email:', updatedAdmin.email);
        console.log('🔑 New Password: AdminPassword123!');
        console.log('👤 Role:', updatedAdmin.role);
        console.log('✅ Verified:', updatedAdmin.verified);
    }
    catch (error) {
        console.error('❌ Error resetting admin password:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
resetAdminPassword();
//# sourceMappingURL=reset-admin-password.js.map