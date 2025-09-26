import { S3Client } from '@aws-sdk/client-s3';
import { SESClient } from '@aws-sdk/client-ses';

// Base AWS configuration - Let AWS SDK use default credential provider chain (IAM role)
const baseConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  // No explicit credentials - AWS SDK will automatically use IAM role via IMDSv2
};

// S3 Client configuration - Use Moto endpoint for local development
const s3Config = {
  ...baseConfig,
  ...(process.env.USE_MOTO === 'true' && process.env.MOTO_ENDPOINT && {
    endpoint: process.env.MOTO_ENDPOINT,
    forcePathStyle: true, // Required for Moto
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test'
    }
  })
};

export const s3Client = new S3Client(s3Config);

// SES Client configuration
export const sesClient = new SESClient(baseConfig);

// AWS Configuration object for other services
export const AWS_CONFIG = {
  region: baseConfig.region,
  bucketName: process.env.AWS_S3_BUCKET || 'gradvillage-dev2-storage-1755338697',
  motoEndpoint: process.env.MOTO_ENDPOINT || null,
  useMoto: process.env.USE_MOTO === 'true'
};

// Debug logging for development
if (process.env.DEBUG_AWS === 'true') {
  console.log('AWS Configuration:', {
    region: baseConfig.region,
    bucket: AWS_CONFIG.bucketName,
    useMoto: AWS_CONFIG.useMoto,
    motoEndpoint: AWS_CONFIG.motoEndpoint,
  });
}