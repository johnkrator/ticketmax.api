import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { CloudStorageService, UploadResult } from './cloud-storage.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads/documents';

  constructor(private cloudStorageService: CloudStorageService) {}

  async onModuleInit() {
    // Ensure the upload directory exists when the module initializes (for local fallback)
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create upload directory:', error);
      // Create a fallback directory
      const fallbackDir = path.join(process.cwd(), 'uploads', 'documents');
      try {
        fs.mkdirSync(fallbackDir, { recursive: true });
        console.log('Created fallback upload directory:', fallbackDir);
      } catch (fallbackError) {
        console.error('Failed to create fallback directory:', fallbackError);
      }
    }
  }

  async uploadFile(
    file: any, // Using 'any' to avoid Express.Multer.File type issues
    organizerId: string,
    documentType: string,
  ): Promise<UploadResult> {
    try {
      // Try cloud storage first
      return await this.cloudStorageService.uploadFile(
        file,
        organizerId,
        documentType,
      );
    } catch (error) {
      console.error(
        'Cloud storage upload failed, falling back to local:',
        error,
      );
      // Fallback to local storage
      return this.uploadFileLocally(file, organizerId, documentType);
    }
  }

  private async uploadFileLocally(
    file: any, // Using 'any' to avoid Express.Multer.File type issues
    organizerId: string,
    documentType: string,
  ): Promise<UploadResult> {
    try {
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const filename = `${organizerId}_${documentType}_${uuidv4()}${fileExtension}`;
      const filePath = path.join(this.uploadDir, filename);

      // Write file to disk
      fs.writeFileSync(filePath, file.buffer);

      // Return local file URL
      const url = `${process.env.API_URL || 'http://localhost:3500'}/files/documents/${filename}`;

      return {
        url,
        key: filename,
        provider: 'local' as any,
      };
    } catch (error) {
      throw new BadRequestException('Failed to upload file locally');
    }
  }

  async deleteFile(uploadResult: UploadResult): Promise<void> {
    if (uploadResult.provider === 'local') {
      return this.deleteFileLocally(uploadResult.key || '');
    }
    return this.cloudStorageService.deleteFile(uploadResult);
  }

  private async deleteFileLocally(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Failed to delete local file:', error);
    }
  }

  async generateSignedUrl(
    uploadResult: UploadResult,
    expiresIn: number = 3600,
  ): Promise<string> {
    if (uploadResult.provider === 'local') {
      return uploadResult.url; // Local files don't need signed URLs
    }
    return this.cloudStorageService.generateSignedUrl(uploadResult, expiresIn);
  }

  async getFileInfo(uploadResult: UploadResult): Promise<any> {
    if (uploadResult.provider === 'local') {
      return this.getLocalFileInfo(uploadResult.key || '');
    }
    return this.cloudStorageService.getFileInfo(uploadResult);
  }

  private getLocalFileInfo(filename: string): any {
    try {
      const filePath = path.join(this.uploadDir, filename);
      const stats = fs.statSync(filePath);
      return {
        url: `${process.env.API_URL || 'http://localhost:3500'}/files/documents/${filename}`,
        size: stats.size,
        uploadedAt: stats.birthtime,
      };
    } catch (error) {
      return null;
    }
  }
}
