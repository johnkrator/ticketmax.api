import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads/documents';

  async onModuleInit() {
    // Ensure the upload directory exists when the module initializes
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

  async uploadFile(file: any, organizerId: string): Promise<string> {
    try {
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const filename = `${organizerId}_${uuidv4()}${fileExtension}`;
      const filePath = path.join(this.uploadDir, filename);

      // Write a file to disk
      fs.writeFileSync(filePath, file.buffer);

      // In production, you would upload to cloud storage (AWS S3, Google Cloud, etc.)
      // For now, return a local file URL
      return `${process.env.API_URL || 'http://localhost:3000'}/files/documents/${filename}`;
    } catch (error) {
      throw new BadRequestException('Failed to upload file');
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const filename = path.basename(fileUrl);
      const filePath = path.join(this.uploadDir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }

  getFileStream(filename: string): fs.ReadStream {
    const filePath = path.join(this.uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }

    return fs.createReadStream(filePath);
  }

  // Validate a file before upload
  validateFile(file: any): void {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and PDF files are allowed',
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }
  }
}
