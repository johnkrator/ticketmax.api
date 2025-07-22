# Cloud Storage Setup Guide

## Installation

Install the required packages for cloud storage:

```bash
npm install cloudinary aws-sdk @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer-storage-cloudinary
```

## Configuration

### 1. Environment Variables

Copy the configuration from `.env.storage` to your main `.env` file:

```env
# Cloud Storage Configuration
STORAGE_PROVIDER=cloudinary  # Options: 'cloudinary', 'aws_s3', 'local'

# Cloudinary Configuration (if using Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AWS S3 Configuration (if using AWS S3)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=your_bucket_name

# Local Storage (fallback)
UPLOAD_DIR=./uploads/documents
API_URL=http://localhost:3500
ENCRYPTION_KEY=your_encryption_key_change_in_production
```

### 2. Cloudinary Setup

1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Get your credentials from the dashboard
3. Update your `.env` file with:
    - `CLOUDINARY_CLOUD_NAME`
    - `CLOUDINARY_API_KEY`
    - `CLOUDINARY_API_SECRET`

### 3. AWS S3 Setup

1. Create an AWS account and S3 bucket
2. Create IAM user with S3 permissions
3. Update your `.env` file with:
    - `AWS_ACCESS_KEY_ID`
    - `AWS_SECRET_ACCESS_KEY`
    - `AWS_S3_BUCKET_NAME`
    - `AWS_REGION`

#### Required S3 Bucket Policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_IAM_USER"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

## Features

### 1. Multi-Provider Support

- **Cloudinary**: Image optimization, transformations, CDN
- **AWS S3**: Reliable object storage with signed URLs
- **Local Storage**: Development fallback

### 2. Security Features

- Private file storage
- Signed URLs for secure access
- File type validation (JPEG, PNG, PDF only)
- File size limits (10MB max)
- Encryption for sensitive data

### 3. Error Handling

- Automatic fallback to local storage
- Cleanup on upload failures
- Comprehensive error messages

## API Endpoints

### Upload Documents

```
POST /organizer/onboarding/{organizerId}/documents
Content-Type: multipart/form-data

Fields:
- idDocument: File (optional)
- businessLicense: File (optional)
- taxDocument: File (optional)
```

### Download Documents

```
GET /organizer/{organizerId}/documents/{documentType}/download
Authorization: Bearer {token}

documentType: 'id' | 'business' | 'tax'
```

## File Organization

### Cloudinary Structure

```
ticketmax/
└── organizer-documents/
    └── organizers/
        └── {organizerId}/
            ├── id-document_{uuid}
            ├── business-license_{uuid}
            └── tax-document_{uuid}
```

### AWS S3 Structure

```
your-bucket/
└── organizer-documents/
    └── {organizerId}/
        ├── id-document_{uuid}_{filename}
        ├── business-license_{uuid}_{filename}
        └── tax-document_{uuid}_{filename}
```

## Production Considerations

1. **Security**:
    - Use environment-specific encryption keys
    - Enable CORS for your domain only
    - Set up proper IAM policies for S3

2. **Performance**:
    - Use CDN for file delivery
    - Implement file compression
    - Set appropriate cache headers

3. **Monitoring**:
    - Monitor upload success rates
    - Track storage usage
    - Set up alerts for failures

4. **Backup**:
    - Enable S3 versioning
    - Set up cross-region replication
    - Regular backup validation
