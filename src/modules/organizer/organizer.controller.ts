import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Patch,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrganizerService } from './organizer.service';
import {
  CreateOrganizerDto,
  UpdateOrganizerStepDto,
} from './dto/create-organizer.dto';
import { JwtAuthGuard } from '../../configurations/jwt_configuration/jwt-auth-guard.service';
import { Roles } from '../../configurations/jwt_configuration/roles.decorator';
import { UserRole } from '../../enums/user-role';
import {
  ThrottleMedium,
  ThrottleShort,
} from '../../configurations/throttler-config/throttler.decorators';

@ApiTags('Organizer Onboarding')
@Controller('organizer')
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  @Post('onboarding/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ThrottleMedium()
  @ApiOperation({ summary: 'Start organizer onboarding process' })
  @ApiResponse({
    status: 201,
    description: 'Onboarding process started successfully',
    schema: {
      type: 'object',
      properties: {
        organizerId: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Organizer already exists' })
  async startOnboarding(
    @Request() req,
    @Body() createOrganizerDto: CreateOrganizerDto,
  ) {
    return this.organizerService.startOnboarding(
      createOrganizerDto,
      req.user.sub, // Use 'sub' instead of 'id' to get the user ID from JWT payload
    );
  }

  @Patch('onboarding/:organizerId/step')
  @ThrottleMedium()
  @ApiOperation({ summary: 'Update specific step of onboarding process' })
  @ApiResponse({
    status: 200,
    description: 'Step updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        nextStep: { type: 'number', nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid step or data',
  })
  @ApiResponse({ status: 404, description: 'Organizer not found' })
  async updateOnboardingStep(
    @Param('organizerId') organizerId: string,
    @Body() updateStepDto: UpdateOrganizerStepDto,
  ) {
    return this.organizerService.updateOnboardingStep(
      organizerId,
      updateStepDto,
    );
  }

  @Post('onboarding/:organizerId/documents')
  @ThrottleMedium()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'idDocument', maxCount: 1 },
        { name: 'businessLicense', maxCount: 1 },
        { name: 'taxDocument', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB
        },
        fileFilter: (req, file, cb) => {
          const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/jpg',
            'application/pdf',
          ];
          if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(
              new BadRequestException(
                `Invalid file type: ${file.mimetype}. Only JPEG, PNG, and PDF files are allowed.`,
              ),
              false,
            );
          }
        },
      },
    ),
  )
  @ApiOperation({ summary: 'Upload verification documents' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Documents uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid files' })
  @ApiResponse({ status: 404, description: 'Organizer not found' })
  async uploadDocuments(
    @Param('organizerId') organizerId: string,
    @UploadedFiles()
    files: {
      idDocument?: any[];
      businessLicense?: any[];
      taxDocument?: any[];
    },
  ) {
    try {
      // Debug logging to see what we receive
      console.log('Received files:', files);
      console.log(
        'Files keys:',
        files ? Object.keys(files) : 'No files object',
      );

      // Check if files object exists
      if (!files) {
        throw new BadRequestException(
          'No files were uploaded. Please ensure you are sending multipart/form-data with one of these field names: idDocument, businessLicense, or taxDocument',
        );
      }

      // Check if any files were uploaded
      if (Object.keys(files).length === 0) {
        throw new BadRequestException(
          'No files uploaded. Please use one of these field names: idDocument, businessLicense, or taxDocument',
        );
      }

      const fileObj: any = {};

      // Process each document type with improved error handling
      const processFile = (fileArray: any[], fieldName: string) => {
        if (fileArray && fileArray[0]) {
          const file = fileArray[0];
          console.log(`Processing ${fieldName}:`, {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          });

          if (!file.buffer || file.buffer.length === 0) {
            throw new BadRequestException(
              `Empty file received for ${fieldName}`,
            );
          }
          return file;
        }
        return null;
      };

      // Process each document type
      if (files.idDocument) {
        const file = processFile(files.idDocument, 'ID document');
        if (file) fileObj.idDocument = file;
      }

      if (files.businessLicense) {
        const file = processFile(files.businessLicense, 'business license');
        if (file) fileObj.businessLicense = file;
      }

      if (files.taxDocument) {
        const file = processFile(files.taxDocument, 'tax document');
        if (file) fileObj.taxDocument = file;
      }

      // Check if at least one valid file was processed
      if (Object.keys(fileObj).length === 0) {
        throw new BadRequestException(
          'No valid files were uploaded. Please upload at least one document using field names: idDocument, businessLicense, or taxDocument',
        );
      }

      return this.organizerService.uploadVerificationDocuments(
        organizerId,
        fileObj,
      );
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  @Get('onboarding/:organizerId/status')
  @ThrottleShort()
  @ApiOperation({ summary: 'Get organizer onboarding status' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding status retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Organizer not found' })
  async getOnboardingStatus(@Param('organizerId') organizerId: string) {
    return this.organizerService.getOnboardingStatus(organizerId);
  }

  @Get('check-email/:email')
  @ThrottleShort()
  @ApiOperation({ summary: 'Check if organizer exists with given email' })
  @ApiResponse({
    status: 200,
    description: 'Email check completed',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
        organizerId: { type: 'string', nullable: true },
        isOnboardingComplete: { type: 'boolean', nullable: true },
        verificationStatus: { type: 'string', nullable: true },
      },
    },
  })
  async checkEmail(@Param('email') email: string) {
    const organizer = await this.organizerService.findByEmail(email);

    if (!organizer) {
      return { exists: false };
    }

    return {
      exists: true,
      organizerId: (organizer._id as any).toString(),
      isOnboardingComplete: organizer.isOnboardingComplete,
      verificationStatus: organizer.verificationStatus,
    };
  }

  // Admin endpoints for reviewing applications
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get('admin/pending-applications')
  @ApiOperation({
    summary: 'Get all pending organizer applications (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending applications retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getPendingApplications() {
    return this.organizerService.getPendingApplications();
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('admin/:organizerId/approve')
  @ApiOperation({ summary: 'Approve organizer application (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Organizer approved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot approve incomplete onboarding',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Organizer not found' })
  async approveOrganizer(
    @Param('organizerId') organizerId: string,
    @Body('adminId') adminId: string,
  ) {
    return this.organizerService.approveOrganizer(organizerId, adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('admin/:organizerId/reject')
  @ApiOperation({ summary: 'Reject organizer application (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Organizer application rejected successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Organizer not found' })
  async rejectOrganizer(
    @Param('organizerId') organizerId: string,
    @Body() body: { adminId: string; reason: string },
  ) {
    return this.organizerService.rejectOrganizer(
      organizerId,
      body.adminId,
      body.reason,
    );
  }

  @Get(':organizerId/details')
  @ApiOperation({ summary: 'Get full organizer details (for admin review)' })
  @ApiResponse({
    status: 200,
    description: 'Organizer details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Organizer not found' })
  async getOrganizerDetails(@Param('organizerId') organizerId: string) {
    return this.organizerService.getOnboardingStatus(organizerId);
  }

  @Get(':organizerId/documents/:documentType/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get signed URL for document download' })
  @ApiResponse({
    status: 200,
    description: 'Document URL retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        expiresIn: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocumentDownloadUrl(
    @Param('organizerId') organizerId: string,
    @Param('documentType') documentType: 'id' | 'business' | 'tax',
    @Request() req,
  ) {
    // Only allow organizer to access their own documents or admin access
    const organizer = await this.organizerService.findByEmail(req.user.email);
    if (!organizer || (organizer._id as any).toString() !== organizerId) {
      if (req.user.role !== 'ADMIN') {
        throw new BadRequestException('Access denied');
      }
    }

    const signedUrl = await this.organizerService.getDocumentSignedUrl(
      organizerId,
      documentType,
      3600, // 1 hour expiry
    );

    return {
      url: signedUrl,
      expiresIn: 3600,
    };
  }

  @Post('test-upload')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'testFile', maxCount: 1 }], {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  @ApiOperation({ summary: 'Test file upload endpoint' })
  @ApiConsumes('multipart/form-data')
  async testUpload(
    @UploadedFiles()
    files: {
      testFile?: any[];
    },
  ) {
    console.log('Test upload - received files:', files);

    if (!files || !files.testFile || files.testFile.length === 0) {
      return {
        success: false,
        message: 'No file uploaded',
        received: files,
      };
    }

    const file = files.testFile[0];
    return {
      success: true,
      message: 'File upload test successful',
      fileInfo: {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        fieldname: file.fieldname,
      },
    };
  }
}
