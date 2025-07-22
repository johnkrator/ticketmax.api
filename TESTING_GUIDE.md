# Testing Cloud Storage Setup

## Quick Test Commands

### 1. Test Local Storage (No packages required)

```bash
# Set environment variable for local testing
export STORAGE_PROVIDER=local

# Start your application
npm run start:dev
```

### 2. Test with Cloudinary

```bash
# Install Cloudinary package
npm install cloudinary

# Set environment variables
export STORAGE_PROVIDER=cloudinary
export CLOUDINARY_CLOUD_NAME=your_cloud_name
export CLOUDINARY_API_KEY=your_api_key
export CLOUDINARY_API_SECRET=your_api_secret

# Start application
npm run start:dev
```

### 3. Test with AWS S3

```bash
# Install AWS SDK
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Set environment variables
export STORAGE_PROVIDER=aws_s3
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_S3_BUCKET_NAME=your_bucket_name

# Start application
npm run start:dev
```

## API Testing

### Upload Document Test

```bash
curl -X POST \
  http://localhost:3500/organizer/onboarding/ORGANIZER_ID/documents \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "idDocument=@/path/to/your/document.pdf"
```

### Download Document Test

```bash
curl -X GET \
  http://localhost:3500/organizer/ORGANIZER_ID/documents/id/download \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Expected Responses

### Successful Upload

```json
{
  "success": true,
  "message": "Verification documents uploaded successfully"
}
```

### Download URL Response

```json
{
  "url": "https://signed-url-here",
  "expiresIn": 3600
}
```

## Troubleshooting

### If packages are missing:

- Application will log warnings and fall back to local storage
- No compilation errors will occur
- Check console for warning messages

### If cloud providers fail:

- Application will attempt local storage fallback
- Check error logs for specific provider issues
- Verify environment variables are set correctly
