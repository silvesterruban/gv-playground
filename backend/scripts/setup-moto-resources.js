"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const s3Service_1 = require("../src/services/aws/s3Service");
const sesService_1 = require("../src/services/aws/sesService");
async function setupMotoResources() {
    console.log('🎭 Setting up Moto AWS resources for Village Platform...');
    console.log('Using Moto server at: http://localhost:5001');
    try {
        // 1. Create S3 bucket
        console.log('\n📦 Setting up S3 bucket...');
        await s3Service_1.s3Service.ensureBucketExists();
        // 2. Test S3 upload
        console.log('\n🧪 Testing S3 upload...');
        const testFile = Buffer.from('Hello from Village Platform!');
        const { key, url } = await s3Service_1.s3Service.uploadFile(testFile, 'test.txt', 'text/plain', 'test-uploads');
        console.log('✅ Test file uploaded:', url);
        // 3. Verify SES email identities
        console.log('\n📧 Setting up SES email identities...');
        const emailsToVerify = [
            process.env.EMAIL_FROM || 'noreply@village.com',
            process.env.EMAIL_ADMIN || 'admin@village.com',
            'test@example.com',
            'donor@example.com',
            'student@example.com'
        ];
        for (const email of emailsToVerify) {
            await sesService_1.sesService.verifyEmailIdentity(email);
        }
        // 4. List verified emails
        const verifiedEmails = await sesService_1.sesService.listVerifiedEmails();
        console.log('✅ Verified emails:', verifiedEmails.join(', '));
        // 5. Test email sending
        console.log('\n📨 Testing email sending...');
        await sesService_1.sesService.sendEmail('test@example.com', '🎭 Moto SES Test Email', '<h1>Village Platform Moto Setup Complete!</h1><p>Your AWS services are ready for development.</p>', 'Village Platform Moto Setup Complete! Your AWS services are ready for development.');
        console.log('\n🎉 Moto resources setup complete!');
        console.log('\nAvailable services:');
        console.log('- S3 Bucket: village-uploads');
        console.log('- S3 Endpoint: http://localhost:5001/village-uploads/');
        console.log('- SES Emails:', verifiedEmails.length, 'verified');
        console.log('- Test file:', url);
    }
    catch (error) {
        console.error('❌ Error setting up Moto resources:', error);
        console.log('\nTroubleshooting:');
        console.log('1. Ensure Moto server is running: docker ps | grep moto');
        console.log('2. Check Moto endpoint: curl http://localhost:5001');
        console.log('3. Restart Moto if needed: docker restart [moto-container-id]');
        process.exit(1);
    }
}
setupMotoResources();
//# sourceMappingURL=setup-moto-resources.js.map