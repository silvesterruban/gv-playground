import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutBucketPolicyCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, AWS_CONFIG } from './config';
import { v4 as uuidv4 } from 'uuid';

export class S3Service {
  private bucketName: string;

  constructor() {
    this.bucketName = AWS_CONFIG.bucketName;
  }

  async ensureBucketExists(): Promise<void> {
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      console.log('✅ S3 bucket', this.bucketName, 'exists');
    } catch (error) {
      console.log('📦 Creating S3 bucket:', this.bucketName, 'in Moto');
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        console.log('✅ S3 bucket', this.bucketName, 'created in Moto');
        
        // Set CORS policy for the bucket
        await this.setBucketCors();
        
        // Set bucket policy for public read access
        await this.setBucketPolicy();
        
      } catch (createError) {
        console.error('Failed to create bucket:', createError);
        throw createError;
      }
    }
  }

  private async setBucketCors(): Promise<void> {
    try {
      const corsCommand = new PutBucketCorsCommand({
        Bucket: this.bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
              AllowedOrigins: ['*'],
              ExposeHeaders: ['ETag'],
            },
          ],
        },
      });
      await s3Client.send(corsCommand);
      console.log('✅ CORS policy set for bucket');
    } catch (error) {
      console.warn('⚠️ Failed to set CORS policy:', error);
    }
  }

  private async setBucketPolicy(): Promise<void> {
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${this.bucketName}/*`,
          },
        ],
      };

      const policyCommand = new PutBucketPolicyCommand({
        Bucket: this.bucketName,
        Policy: JSON.stringify(policy),
      });
      await s3Client.send(policyCommand);
      console.log('✅ Public read policy set for bucket');
    } catch (error) {
      console.warn('⚠️ Failed to set bucket policy:', error);
    }
  }

  async uploadFile(
    file: Buffer | Uint8Array | string,
    fileName: string,
    contentType: string,
    folder: string = 'uploads'
  ): Promise<{ key: string; url: string }> {
    const key = folder + '/' + uuidv4() + '-' + fileName;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: contentType
    });

    await s3Client.send(command);

    // Construct proper URL based on environment
    let url: string;
    if (process.env.USE_MOTO === 'true' && process.env.MOTO_ENDPOINT) {
      // For Moto (local development), use the Moto endpoint
      const motoBase = process.env.MOTO_ENDPOINT.replace('http://', '').replace('https://', '');
      url = `http://${motoBase}/${this.bucketName}/${key}`;
    } else {
      // For real S3 (production), use standard S3 URL
      url = `https://${this.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;
    }

    console.log('📁 File uploaded to S3:', url);
    return { key, url };
  }

  async getSignedUploadUrl(
    fileName: string,
    contentType: string,
    folder: string = 'uploads'
  ): Promise<{ uploadUrl: string; key: string; downloadUrl: string }> {
    const key = folder + '/' + uuidv4() + '-' + fileName;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Construct proper download URL based on environment
    let downloadUrl: string;
    if (process.env.USE_MOTO === 'true' && process.env.MOTO_ENDPOINT) {
      // For Moto (local development), use the Moto endpoint
      const motoBase = process.env.MOTO_ENDPOINT.replace('http://', '').replace('https://', '');
      downloadUrl = `http://${motoBase}/${this.bucketName}/${key}`;
    } else {
      // For real S3 (production), use standard S3 URL
      downloadUrl = `https://${this.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;
    }

    return { uploadUrl, key, downloadUrl };
  }

  async listFiles(folder?: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: folder ? folder + '/' : undefined,
    });

    const response = await s3Client.send(command);
    return response.Contents?.map(obj => obj.Key || '') || [];
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await s3Client.send(command);
    console.log('🗑️  File deleted from Moto S3:', key);
  }

  // Download file from S3
  async downloadFile(url: string): Promise<Buffer> {
    try {
      // Extract key from URL
      let key: string;
      if (url.includes('.s3.')) {
        // Real S3 URL format: https://bucket.s3.region.amazonaws.com/key
        const urlParts = url.split('.s3.')[1];
        key = urlParts.split('/').slice(1).join('/');
      } else if (url.includes('moto')) {
        // Moto URL format: http://moto:5000/bucket/key
        const urlParts = url.split('/');
        key = urlParts.slice(4).join('/'); // Skip http://moto:5000/bucket/
      } else {
        throw new Error('Invalid S3 URL format');
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No file content found');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('❌ Failed to download file from S3:', error);
      throw error;
    }
  }

  // Helper method to get public URL for a file
  getPublicUrl(key: string): string {
    if (process.env.USE_MOTO === 'true' && process.env.MOTO_ENDPOINT) {
      // For Moto (local development), use the Moto endpoint
      const motoBase = process.env.MOTO_ENDPOINT.replace('http://', '').replace('https://', '');
      return `http://${motoBase}/${this.bucketName}/${key}`;
    } else {
      // For real S3 (production), use standard S3 URL
      return `https://${this.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;
    }
  }
}

export const s3Service = new S3Service();
