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

@ApiTags('Organizer Onboarding')
@Controller('organizer')
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  @Post('onboarding/start')
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
  async startOnboarding(@Body() createOrganizerDto: CreateOrganizerDto) {
    return this.organizerService.startOnboarding(createOrganizerDto);
  }

  @Patch('onboarding/:organizerId/step')
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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'idDocument', maxCount: 1 },
      { name: 'businessLicense', maxCount: 1 },
      { name: 'taxDocument', maxCount: 1 },
    ]),
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
    // Validate file types
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

    const fileObj: any = {};

    if (files.idDocument?.[0]) {
      if (!allowedMimeTypes.includes(files.idDocument[0].mimetype)) {
        throw new BadRequestException('Invalid file type for ID document');
      }
      fileObj.idDocument = files.idDocument[0];
    }

    if (files.businessLicense?.[0]) {
      if (!allowedMimeTypes.includes(files.businessLicense[0].mimetype)) {
        throw new BadRequestException('Invalid file type for business license');
      }
      fileObj.businessLicense = files.businessLicense[0];
    }

    if (files.taxDocument?.[0]) {
      if (!allowedMimeTypes.includes(files.taxDocument[0].mimetype)) {
        throw new BadRequestException('Invalid file type for tax document');
      }
      fileObj.taxDocument = files.taxDocument[0];
    }

    return this.organizerService.uploadVerificationDocuments(
      organizerId,
      fileObj,
    );
  }

  @Get('onboarding/:organizerId/status')
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
}
