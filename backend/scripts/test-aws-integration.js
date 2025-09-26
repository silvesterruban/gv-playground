"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const s3Service_1 = require("../src/services/aws/s3Service");
const sesService_1 = require("../src/services/aws/sesService");
async function testAWSIntegration() {
    console.log('🧪 Testing Village Platform AWS integration with Moto...');
    try {
        // Test S3 operations
        console.log('\n📦 Testing S3 operations...');
        // Upload test file
        const testContent = Buffer.from('Village Platform Test - ' + new Date().toISOString());
        const upload = await s3Service_1.s3Service.uploadFile(testContent, 'integration-test.txt', 'text/plain', 'tests');
        console.log('✅ File uploaded:', upload.url);
        // Generate signed URL
        const signedUrl = await s3Service_1.s3Service.getSignedUploadUrl('signed-test.txt', 'text/plain', 'tests');
        console.log('✅ Signed URL generated:', signedUrl.uploadUrl.substring(0, 100) + '...');
        // List files
        const files = await s3Service_1.s3Service.listFiles('tests');
        console.log('✅ Files in tests folder:', files.length);
        // Test SES operations
        console.log('\n📧 Testing SES operations...');
        // Send test email
        await sesService_1.sesService.sendEmail('test@example.com', '🧪 AWS Integration Test', '<h2>All AWS services are working!</h2><p>S3 and SES integration successful.</p>');
        console.log('✅ Test email sent');
        // Send welcome email test
        await sesService_1.sesService.sendWelcomeEmail('Test Student', 'student@example.com');
        console.log('✅ Welcome email sent');
        console.log('\n🎉 All AWS integration tests passed!');
        console.log('\nYour Moto setup is ready for Village Platform development.');
    }
    catch (error) {
        console.error('❌ AWS integration test failed:', error);
        process.exit(1);
    }
}
testAWSIntegration();
//# sourceMappingURL=test-aws-integration.js.map