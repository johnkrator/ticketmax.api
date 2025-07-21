import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum StorageProvider {
  CLOUDINARY = 'cloudinary',
  AWS_S3 = 'aws_s3',
  LOCAL = 'local',
}

export interface UploadResult {
  url: string;
  publicId?: string;
  key?: string;
  provider: StorageProvider;
}

@Injectable()
export class CloudStorageService {
  private s3Client: any;
  private cloudinary: any;
  private readonly storageProvider: StorageProvider;

  constructor(private configService: ConfigService) {
    this.storageProvider = this.configService.get<StorageProvider>(
      'STORAGE_PROVIDER',
      StorageProvider.LOCAL,
    );

    this.initializeStorageProviders();
  }

  private async initializeStorageProviders() {
    try {
      // Initialize Cloudinary
      if (this.storageProvider === StorageProvider.CLOUDINARY) {
        const cloudinary = await import('cloudinary').catch(() => null);
        if (cloudinary) {
          this.cloudinary = cloudinary.v2;
          this.cloudinary.config({
            cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
          });
        } else {
          console.warn(
            'Cloudinary package not instal led, falling back to local storage',
          );
        }
      }

      // Initialize AWS S3
      if (this.storageProvider === StorageProvider.AWS_S3) {
        const { S3Client } = await import('@aws-sdk/client-s3').catch(() => ({
          S3Client: null,
        }));
        if (S3Client) {
          const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
          const secretAccessKey = this.configService.get(
            'AWS_SECRET_ACCESS_KEY',
          );

          if (accessKeyId && secretAccessKey) {
            this.s3Client = new S3Client({
              region: this.configService.get('AWS_REGION', 'us-east-1'),
              credentials: {
                accessKeyId,
                secretAccessKey,
              },
            });
          } else {
            console.warn(
              'AWS credentials not provided, falling back to local storage',
            );
          }
        } else {
          console.warn(
            'AWS SDK package not installed, falling back to local storage',
          );
        }
      }
    } catch (error) {
      console.error('Error initializing cloud storage providers:', error);
    }
  }

  async uploadFile(
    file: any, // Using 'any' to avoid Express.Multer.File type issues
    organizerId: string,
    documentType: string,
  ): Promise<UploadResult> {
    this.validateFile(file);

    // Check if cloud providers are available, otherwise fall back to local
    if (
      this.storageProvider === StorageProvider.CLOUDINARY &&
      this.cloudinary
    ) {
      return this.uploadToCloudinary(file, organizerId, documentType);
    } else if (
      this.storageProvider === StorageProvider.AWS_S3 &&
      this.s3Client
    ) {
      return this.uploadToS3(file, organizerId, documentType);
    } else {
      throw new BadRequestException(
        'Cloud storage not configured or packages not installed',
      );
    }
  }

  private async uploadToCloudinary(
    file: any,
    organizerId: string,
    documentType: string,
  ): Promise<UploadResult> {
    try {
      const publicId = `organizers/${organizerId}/${documentType}_${this.generateUuid()}`;

      const result = await this.cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        {
          public_id: publicId,
          folder: 'ticketmax/organizer-documents',
          resource_type: 'auto',
          access_mode: 'authenticated',
          type: 'private',
          tags: ['organizer-document', documentType, organizerId],
          context: {
            organizerId,
            documentType,
            uploadedAt: new Date().toISOString(),
          },
        },
      );

      return {
        url: result.secure_url,
        publicId: result.public_id,
        provider: StorageProvider.CLOUDINARY,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new BadRequestException('Failed to upload file to Cloudinary');
    }
  }

  private async uploadToS3(
    file: any,
    organizerId: string,
    documentType: string,
  ): Promise<UploadResult> {
    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const key = `organizer-documents/${organizerId}/${documentType}_${this.generateUuid()}_${file.originalname}`;
      const bucketName = this.configService.get('AWS_S3_BUCKET_NAME');

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          organizerId,
          documentType,
          uploadedAt: new Date().toISOString(),
        },
        ServerSideEncryption: 'AES256',
        ACL: 'private',
      });

      await this.s3Client.send(command);

      const url = `https://${bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;

      return {
        url,
        key,
        provider: StorageProvider.AWS_S3,
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new BadRequestException('Failed to upload file to AWS S3');
    }
  }

  async deleteFile(uploadResult: UploadResult): Promise<void> {
    try {
      switch (uploadResult.provider) {
        case StorageProvider.CLOUDINARY:
          if (uploadResult.publicId) {
            await this.deleteFromCloudinary(uploadResult.publicId);
          }
          break;
        case StorageProvider.AWS_S3:
          if (uploadResult.key) {
            await this.deleteFromS3(uploadResult.key);
          }
          break;
        default:
          console.warn('Unknown storage provider for deletion');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  private async deleteFromCloudinary(publicId: string): Promise<void> {
    try {
      if (this.cloudinary) {
        await this.cloudinary.uploader.destroy(publicId);
      }
    } catch (error) {
      console.error('Cloudinary deletion error:', error);
      throw new BadRequestException('Failed to delete file from Cloudinary');
    }
  }

  private async deleteFromS3(key: string): Promise<void> {
    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const bucketName = this.configService.get('AWS_S3_BUCKET_NAME');
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('S3 deletion error:', error);
      throw new BadRequestException('Failed to delete file from AWS S3');
    }
  }

  async generateSignedUrl(
    uploadResult: UploadResult,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      switch (uploadResult.provider) {
        case StorageProvider.CLOUDINARY:
          if (uploadResult.publicId) {
            return this.generateCloudinarySignedUrl(
              uploadResult.publicId,
              expiresIn,
            );
          }
          break;
        case StorageProvider.AWS_S3:
          if (uploadResult.key) {
            return await this.generateS3SignedUrl(uploadResult.key, expiresIn);
          }
          break;
      }
      return uploadResult.url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return uploadResult.url;
    }
  }

  private generateCloudinarySignedUrl(
    publicId: string,
    expiresIn: number,
  ): string {
    if (!this.cloudinary) {
      throw new BadRequestException('Cloudinary not configured');
    }

    const timestamp = Math.round(Date.now() / 1000) + expiresIn;

    return this.cloudinary.utils.private_download_url(publicId, 'auto', {
      expires_at: timestamp,
    });
  }

  private async generateS3SignedUrl(
    key: string,
    expiresIn: number,
  ): Promise<string> {
    try {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');

      const command = new GetObjectCommand({
        Bucket: this.configService.get('AWS_S3_BUCKET_NAME'),
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('S3 signed URL generation error:', error);
      throw new BadRequestException('Failed to generate signed URL');
    }
  }

  private validateFile(file: any): void {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and PDF files are allowed',
      );
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        'File size too large. Maximum size is 10MB',
      );
    }
  }

  async getFileInfo(uploadResult: UploadResult): Promise<any> {
    try {
      switch (uploadResult.provider) {
        case StorageProvider.CLOUDINARY:
          if (uploadResult.publicId) {
            return await this.getCloudinaryFileInfo(uploadResult.publicId);
          }
          break;
        case StorageProvider.AWS_S3:
          if (uploadResult.key) {
            return await this.getS3FileInfo(uploadResult.key);
          }
          break;
      }
      return { url: uploadResult.url };
    } catch (error) {
      console.error('Error getting file info:', error);
      return { url: uploadResult.url };
    }
  }

  private async getCloudinaryFileInfo(publicId: string): Promise<any> {
    try {
      if (!this.cloudinary) {
        return null;
      }

      const result = await this.cloudinary.api.resource(publicId);
      return {
        url: result.secure_url,
        size: result.bytes,
        format: result.format,
        uploadedAt: result.created_at,
        tags: result.tags,
        context: result.context,
      };
    } catch (error) {
      console.error('Cloudinary file info error:', error);
      return null;
    }
  }

  private async getS3FileInfo(key: string): Promise<any> {
    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new HeadObjectCommand({
        Bucket: this.configService.get('AWS_S3_BUCKET_NAME'),
        Key: key,
      });

      const result = await this.s3Client.send(command);
      return {
        key,
        size: result.ContentLength,
        contentType: result.ContentType,
        lastModified: result.LastModified,
        metadata: result.Metadata,
      };
    } catch (error) {
      console.error('S3 file info error:', error);
      return null;
    }
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }
}
