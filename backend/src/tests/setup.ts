import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
const testEnvPath = path.join(__dirname, '../../test.env');
dotenv.config({ path: testEnvPath });

// Ensure test environment is set
process.env.NODE_ENV = 'test';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock AWS services for testing
jest.mock('../services/aws/s3Service', () => ({
  s3Service: {
    uploadFile: jest.fn().mockResolvedValue('test-file-url'),
    deleteFile: jest.fn().mockResolvedValue(true),
    getSignedUrl: jest.fn().mockResolvedValue('test-signed-url'),
  },
}));

jest.mock('../services/aws/sesService', () => ({
  sesService: {
    sendEmail: jest.fn().mockResolvedValue(true),
    verifyEmailIdentity: jest.fn().mockResolvedValue(true),
  },
}));

// Global test timeout
jest.setTimeout(30000);

// Keep console logs for debugging (remove suppression)
// const originalConsoleLog = console.log;
// const originalConsoleError = console.error;

// beforeAll(() => {
//   console.log = jest.fn();
//   console.error = jest.fn();
// });

// afterAll(() => {
//   console.log = originalConsoleLog;
//   console.error = originalConsoleError;
// });

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
}); 