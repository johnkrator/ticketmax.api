import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Organizer,
  OrganizerDocument,
  VerificationStatus,
  OrganizationType,
} from './entities/organizer.entity';
import {
  CreateOrganizerDto,
  UpdateOrganizerStepDto,
} from './dto/create-organizer.dto';
import { OrganizerEmailService } from './organizer-email.service';
import { FileStorageService } from './file-storage.service';
import { UploadResult } from './cloud-storage.service';
import * as crypto from 'crypto';

@Injectable()
export class OrganizerService {
  constructor(
    @InjectModel(Organizer.name)
    private organizerModel: Model<OrganizerDocument>,
    private organizerEmailService: OrganizerEmailService,
    private fileStorageService: FileStorageService,
  ) {}

  // Start organizer onboarding process
  async startOnboarding(
    createOrganizerDto: CreateOrganizerDto,
    userId: string,
  ): Promise<{ organizerId: string; message: string }> {
    // Check if organizer already exists with this email
    const existingOrganizer = await this.organizerModel.findOne({
      'personalInformation.email': createOrganizerDto.personalInformation.email,
    });

    if (existingOrganizer) {
      if (existingOrganizer.isOnboardingComplete) {
        throw new ConflictException(
          'An organizer with this email already exists and has completed onboarding',
        );
      }
      // If onboarding is not complete, allow updating
      return {
        organizerId: (existingOrganizer._id as any).toString(),
        message:
          'Existing onboarding process found. You can continue from where you left off.',
      };
    }

    // Validate organization details based on type
    this.validateOrganizationDetails(createOrganizerDto.organizationDetails);

    // Encrypt sensitive banking information if provided
    if (createOrganizerDto.bankingInformation) {
      createOrganizerDto.bankingInformation.accountNumber =
        this.encryptSensitiveData(
          createOrganizerDto.bankingInformation.accountNumber,
        );
    }

    const organizer = new this.organizerModel({
      ...createOrganizerDto,
      userId: userId, // Add the userId field
      personalInformation: {
        ...createOrganizerDto.personalInformation,
        dateOfBirth: new Date(
          createOrganizerDto.personalInformation.dateOfBirth,
        ),
      },
      currentStep: 1,
      verificationStatus: VerificationStatus.PENDING,
      isActive: false,
      isOnboardingComplete: false,
    });

    await organizer.save();

    // Send a welcome email
    try {
      await this.organizerEmailService.sendOnboardingStartedEmail(
        organizer.personalInformation.email,
        `${organizer.personalInformation.firstName} ${organizer.personalInformation.lastName}`,
      );
    } catch (error) {
      console.error('Failed to send onboarding email:', error);
    }

    return {
      organizerId: (organizer._id as any).toString(),
      message: 'Onboarding process started successfully',
    };
  }

  // Update specific step of onboarding
  async updateOnboardingStep(
    organizerId: string,
    updateStepDto: UpdateOrganizerStepDto,
  ): Promise<{ success: boolean; message: string; nextStep?: number }> {
    const organizer = await this.organizerModel.findById(organizerId);

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    if (organizer.isOnboardingComplete) {
      throw new BadRequestException('Onboarding has already been completed');
    }

    // Validate step progression
    if (updateStepDto.currentStep < organizer.currentStep) {
      throw new BadRequestException('Cannot go back to previous steps');
    }

    // Update the specific step data
    const updateData: any = {
      currentStep: Math.max(updateStepDto.currentStep, organizer.currentStep),
    };

    if (updateStepDto.personalInformation) {
      updateData.personalInformation = {
        ...updateStepDto.personalInformation,
        dateOfBirth: new Date(updateStepDto.personalInformation.dateOfBirth),
      };
    }

    if (updateStepDto.organizationDetails) {
      this.validateOrganizationDetails(updateStepDto.organizationDetails);
      updateData.organizationDetails = updateStepDto.organizationDetails;
    }

    if (updateStepDto.address) {
      updateData.address = updateStepDto.address;
    }

    if (updateStepDto.bankingInformation) {
      updateData.bankingInformation = {
        ...updateStepDto.bankingInformation,
        accountNumber: this.encryptSensitiveData(
          updateStepDto.bankingInformation.accountNumber,
        ),
        isVerified: false,
      };
    }

    if (updateStepDto.experienceDetails) {
      updateData.experienceDetails = updateStepDto.experienceDetails;
    }

    // Check if this is the final step (step 6)
    if (updateStepDto.currentStep === 6 && updateStepDto.experienceDetails) {
      updateData.isOnboardingComplete = true;
      updateData.verificationStatus = VerificationStatus.UNDER_REVIEW;

      // Send application submitted email
      try {
        await this.organizerEmailService.sendApplicationSubmittedEmail(
          organizer.personalInformation.email,
          `${organizer.personalInformation.firstName} ${organizer.personalInformation.lastName}`,
        );

        // Notify admins
        await this.organizerEmailService.sendAdminNotificationEmail(
          organizer.personalInformation.email,
          `${organizer.personalInformation.firstName} ${organizer.personalInformation.lastName}`,
        );
      } catch (error) {
        console.error('Failed to send application emails:', error);
      }
    }

    await this.organizerModel.findByIdAndUpdate(organizerId, updateData);

    const nextStep =
      updateStepDto.currentStep < 6 ? updateStepDto.currentStep + 1 : undefined;
    const message = updateData.isOnboardingComplete
      ? 'Onboarding completed successfully. Your application is now under review.'
      : `Step ${updateStepDto.currentStep} updated successfully`;

    return { success: true, message, nextStep };
  }

  // Upload verification documents
  async uploadVerificationDocuments(
    organizerId: string,
    files: {
      idDocument?: any; // Using 'any' to avoid Express.Multer.File type issues
      businessLicense?: any;
      taxDocument?: any;
    },
  ): Promise<{ success: boolean; message: string }> {
    const organizer = await this.organizerModel.findById(organizerId);

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    const verificationDocuments: any = {};
    const uploadResults: UploadResult[] = [];

    try {
      if (files.idDocument) {
        const result = await this.fileStorageService.uploadFile(
          files.idDocument,
          organizerId,
          'id-document',
        );
        verificationDocuments.idDocumentUrl = result.url;
        verificationDocuments.idDocumentData = result;
        uploadResults.push(result);
      }

      if (files.businessLicense) {
        const result = await this.fileStorageService.uploadFile(
          files.businessLicense,
          organizerId,
          'business-license',
        );
        verificationDocuments.businessLicenseUrl = result.url;
        verificationDocuments.businessLicenseData = result;
        uploadResults.push(result);
      }

      if (files.taxDocument) {
        const result = await this.fileStorageService.uploadFile(
          files.taxDocument,
          organizerId,
          'tax-document',
        );
        verificationDocuments.taxDocumentUrl = result.url;
        verificationDocuments.taxDocumentData = result;
        uploadResults.push(result);
      }

      verificationDocuments.uploadedAt = new Date();

      await this.organizerModel.findByIdAndUpdate(organizerId, {
        verificationDocuments,
        currentStep: Math.max(organizer.currentStep, 4), // Documents are step 4
      });

      return {
        success: true,
        message: 'Verification documents uploaded successfully',
      };
    } catch (error) {
      // Clean up any uploaded files if there was an error
      for (const result of uploadResults) {
        try {
          await this.fileStorageService.deleteFile(result);
        } catch (deleteError) {
          console.error('Error cleaning up uploaded file:', deleteError);
        }
      }
      throw error;
    }
  }

  // Generate signed URLs for accessing uploaded documents
  async getDocumentSignedUrl(
    organizerId: string,
    documentType: 'id' | 'business' | 'tax',
    expiresIn: number = 3600,
  ): Promise<string> {
    const organizer = await this.organizerModel.findById(organizerId);

    if (!organizer || !organizer.verificationDocuments) {
      throw new NotFoundException('Documents not found');
    }

    let uploadResult: UploadResult;
    switch (documentType) {
      case 'id':
        uploadResult = organizer.verificationDocuments.idDocumentData;
        break;
      case 'business':
        uploadResult = organizer.verificationDocuments.businessLicenseData;
        break;
      case 'tax':
        uploadResult = organizer.verificationDocuments.taxDocumentData;
        break;
      default:
        throw new BadRequestException('Invalid document type');
    }

    if (!uploadResult) {
      throw new NotFoundException(`${documentType} document not found`);
    }

    return this.fileStorageService.generateSignedUrl(uploadResult, expiresIn);
  }

  // Get organizer onboarding status
  async getOnboardingStatus(organizerId: string): Promise<any> {
    const organizer = await this.organizerModel.findById(organizerId);

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    return {
      organizerId: organizer._id,
      currentStep: organizer.currentStep,
      isOnboardingComplete: organizer.isOnboardingComplete,
      verificationStatus: organizer.verificationStatus,
      personalInformation: organizer.personalInformation,
      organizationDetails: organizer.organizationDetails,
      address: organizer.address,
      hasVerificationDocuments: !!organizer.verificationDocuments,
      hasBankingInformation: !!organizer.bankingInformation,
      hasExperienceDetails: !!organizer.experienceDetails,
      verifiedAt: organizer.verifiedAt,
      rejectionReason: organizer.rejectionReason,
    };
  }

  // Get organizer by email (for checking existing applications)
  async findByEmail(email: string): Promise<OrganizerDocument | null> {
    return this.organizerModel.findOne({ 'personalInformation.email': email });
  }

  // Admin methods for reviewing applications
  async approveOrganizer(
    organizerId: string,
    adminId: string,
  ): Promise<{ success: boolean; message: string }> {
    const organizer = await this.organizerModel.findById(organizerId);

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    if (!organizer.isOnboardingComplete) {
      throw new BadRequestException('Cannot approve incomplete onboarding');
    }

    await this.organizerModel.findByIdAndUpdate(organizerId, {
      verificationStatus: VerificationStatus.APPROVED,
      isActive: true,
      verifiedAt: new Date(),
      reviewedBy: adminId,
    });

    // Send approval email
    try {
      await this.organizerEmailService.sendApprovalEmail(
        organizer.personalInformation.email,
        `${organizer.personalInformation.firstName} ${organizer.personalInformation.lastName}`,
      );
    } catch (error) {
      console.error('Failed to send approval email:', error);
    }

    return { success: true, message: 'Organizer approved successfully' };
  }

  async rejectOrganizer(
    organizerId: string,
    adminId: string,
    reason: string,
  ): Promise<{ success: boolean; message: string }> {
    const organizer = await this.organizerModel.findById(organizerId);

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    await this.organizerModel.findByIdAndUpdate(organizerId, {
      verificationStatus: VerificationStatus.REJECTED,
      rejectionReason: reason,
      reviewedBy: adminId,
    });

    // Send rejection email
    try {
      await this.organizerEmailService.sendRejectionEmail(
        organizer.personalInformation.email,
        `${organizer.personalInformation.firstName} ${organizer.personalInformation.lastName}`,
        reason,
      );
    } catch (error) {
      console.error('Failed to send rejection email:', error);
    }

    return { success: true, message: 'Organizer application rejected' };
  }

  // Get all pending organizer applications (for admin)
  async getPendingApplications(): Promise<any[]> {
    const organizers = await this.organizerModel
      .find({
        verificationStatus: {
          $in: [VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW],
        },
        isOnboardingComplete: true,
      })
      .sort({ createdAt: -1 });

    return organizers.map((organizer) => ({
      id: organizer._id,
      name: `${organizer.personalInformation.firstName} ${organizer.personalInformation.lastName}`,
      email: organizer.personalInformation.email,
      organizationType: organizer.organizationDetails.organizationType,
      organizationName: organizer.organizationDetails.organizationName,
      verificationStatus: organizer.verificationStatus,
      submittedAt: (organizer as any).updatedAt,
      hasDocuments: !!organizer.verificationDocuments,
    }));
  }

  // Private helper methods
  private validateOrganizationDetails(organizationDetails: any): void {
    if (organizationDetails.organizationType !== OrganizationType.INDIVIDUAL) {
      if (!organizationDetails.organizationName) {
        throw new BadRequestException(
          'Organization name is required for company/nonprofit',
        );
      }
    }
  }

  private encryptSensitiveData(data: string): string {
    // In a real implementation, use proper encryption
    // This is a simplified example using the modern createCipheriv method
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || 'default-key-change-in-production',
      'salt',
      32,
    );
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }
}
