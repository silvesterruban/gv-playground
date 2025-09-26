"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuperAdmin = createSuperAdmin;
// backend/scripts/create-admin.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const jwt_1 = require("../src/utils/jwt");
const prisma = new client_1.PrismaClient();
async function createSuperAdmin() {
    try {
        console.log('Creating super admin account...');
        // Check if super admin already exists
        const existingAdmin = await prisma.admin.findFirst({
            where: { role: 'super_admin' }
        });
        if (existingAdmin) {
            console.log('Super admin already exists:', existingAdmin.email);
            return;
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash('AdminPassword123!', 12);
        // Create super admin
        const admin = await prisma.admin.create({
            data: {
                email: 'admin@village.com',
                passwordHash,
                firstName: 'Super',
                lastName: 'Admin',
                role: 'super_admin',
                verified: true,
                isActive: true
            }
        });
        console.log('✅ Super admin created successfully!');
        console.log('📧 Email:', admin.email);
        console.log('🔑 Password: AdminPassword123!');
        console.log('⚠️  Please change the password after first login');
        // Generate a token for testing
        const token = jwt_1.JWTUtils.generateToken({
            id: admin.id,
            email: admin.email,
            userType: 'admin',
            verified: admin.verified,
            role: admin.role
        });
        console.log('🔐 Test token:', token);
    }
    catch (error) {
        console.error('❌ Error creating super admin:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run if this file is executed directly
if (require.main === module) {
    createSuperAdmin();
}
//# sourceMappingURL=create-admin.js.map