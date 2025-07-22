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

    // Start with existing verification documents to preserve previously uploaded files
    const verificationDocuments: any = organizer.verificationDocuments || {};
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

      // Update the uploadedAt timestamp for the most recent upload
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

    // Check document status
    const documentStatus = {
      idDocument: {
        uploaded: !!organizer.verificationDocuments?.idDocumentUrl,
        url: organizer.verificationDocuments?.idDocumentUrl || null,
        status: organizer.verificationDocuments?.idDocumentUrl
          ? 'uploaded'
          : 'missing',
      },
      businessLicense: {
        uploaded: !!organizer.verificationDocuments?.businessLicenseUrl,
        url: organizer.verificationDocuments?.businessLicenseUrl || null,
        status: organizer.verificationDocuments?.businessLicenseUrl
          ? 'uploaded'
          : 'missing',
      },
      taxDocument: {
        uploaded: !!organizer.verificationDocuments?.taxDocumentUrl,
        url: organizer.verificationDocuments?.taxDocumentUrl || null,
        status: organizer.verificationDocuments?.taxDocumentUrl
          ? 'uploaded'
          : 'missing',
      },
    };

    // Count uploaded and missing documents
    const uploadedDocuments = Object.values(documentStatus).filter(
      (doc) => doc.uploaded,
    );
    const missingDocuments = Object.values(documentStatus).filter(
      (doc) => !doc.uploaded,
    );

    // Get list of missing document types
    const missingDocumentTypes = Object.entries(documentStatus)
      .filter(([_, doc]) => !doc.uploaded)
      .map(([type, _]) => type);

    // Determine overall document status
    let overallDocumentStatus = 'pending';
    if (uploadedDocuments.length === 0) {
      overallDocumentStatus = 'not_started';
    } else if (missingDocuments.length === 0) {
      overallDocumentStatus = 'complete';
    }

    // Check completion status for each step
    const stepRequirements = {
      step1: {
        name: 'Personal Information',
        required: true,
        completed: !!(
          organizer.personalInformation?.firstName &&
          organizer.personalInformation?.lastName &&
          organizer.personalInformation?.email &&
          organizer.personalInformation?.phone &&
          organizer.personalInformation?.dateOfBirth
        ),
        missing: [] as string[],
      },
      step2: {
        name: 'Organization Details',
        required: true,
        completed: !!(
          organizer.organizationDetails?.organizationType &&
          organizer.organizationDetails?.description
        ),
        missing: [] as string[],
      },
      step3: {
        name: 'Address Information',
        required: true,
        completed: !!(
          organizer.address?.address &&
          organizer.address?.city &&
          organizer.address?.state &&
          organizer.address?.zipCode &&
          organizer.address?.country
        ),
        missing: [] as string[],
      },
      step4: {
        name: 'Verification Documents',
        required: true,
        completed: overallDocumentStatus === 'complete',
        missing: missingDocumentTypes,
      },
      step5: {
        name: 'Banking Information',
        required: true,
        completed: !!(
          organizer.bankingInformation?.bankName &&
          organizer.bankingInformation?.accountNumber &&
          organizer.bankingInformation?.routingNumber &&
          organizer.bankingInformation?.accountHolderName
        ),
        missing: [] as string[],
      },
      step6: {
        name: 'Experience Details',
        required: true,
        completed: !!(
          organizer.experienceDetails?.eventExperience &&
          organizer.experienceDetails?.expectedEventVolume
        ),
        missing: [] as string[],
      },
    };

    // Add specific missing items for each step
    if (!stepRequirements.step1.completed) {
      const missing: string[] = [];
      if (!organizer.personalInformation?.firstName) missing.push('firstName');
      if (!organizer.personalInformation?.lastName) missing.push('lastName');
      if (!organizer.personalInformation?.email) missing.push('email');
      if (!organizer.personalInformation?.phone) missing.push('phone');
      if (!organizer.personalInformation?.dateOfBirth)
        missing.push('dateOfBirth');
      stepRequirements.step1.missing = missing;
    }

    if (!stepRequirements.step2.completed) {
      const missing: string[] = [];
      if (!organizer.organizationDetails?.organizationType)
        missing.push('organizationType');
      if (!organizer.organizationDetails?.description)
        missing.push('description');
      stepRequirements.step2.missing = missing;
    }

    if (!stepRequirements.step3.completed) {
      const missing: string[] = [];
      if (!organizer.address?.address) missing.push('address');
      if (!organizer.address?.city) missing.push('city');
      if (!organizer.address?.state) missing.push('state');
      if (!organizer.address?.zipCode) missing.push('zipCode');
      if (!organizer.address?.country) missing.push('country');
      stepRequirements.step3.missing = missing;
    }

    if (!stepRequirements.step5.completed) {
      const missing: string[] = [];
      if (!organizer.bankingInformation?.bankName) missing.push('bankName');
      if (!organizer.bankingInformation?.accountNumber)
        missing.push('accountNumber');
      if (!organizer.bankingInformation?.routingNumber)
        missing.push('routingNumber');
      if (!organizer.bankingInformation?.accountHolderName)
        missing.push('accountHolderName');
      stepRequirements.step5.missing = missing;
    }

    if (!stepRequirements.step6.completed) {
      const missing: string[] = [];
      if (!organizer.experienceDetails?.eventExperience)
        missing.push('eventExperience');
      if (!organizer.experienceDetails?.expectedEventVolume)
        missing.push('expectedEventVolume');
      stepRequirements.step6.missing = missing;
    }

    // Calculate overall completion
    const completedSteps = Object.values(stepRequirements).filter(
      (step) => step.completed,
    ).length;
    const totalSteps = Object.keys(stepRequirements).length;
    const allStepsCompleted = completedSteps === totalSteps;

    // Get pending requirements
    const pendingRequirements = Object.entries(stepRequirements)
      .filter(([_, step]) => !step.completed)
      .map(([stepKey, step]) => ({
        step: stepKey,
        name: step.name,
        missing: step.missing,
      }));

    // Auto-complete onboarding if all steps are done but not marked complete
    if (allStepsCompleted && !organizer.isOnboardingComplete) {
      await this.organizerModel.findByIdAndUpdate(organizerId, {
        isOnboardingComplete: true,
        currentStep: 6,
        verificationStatus: VerificationStatus.UNDER_REVIEW,
      });

      // Update the local object for response
      organizer.isOnboardingComplete = true;
      organizer.currentStep = 6;
      organizer.verificationStatus = VerificationStatus.UNDER_REVIEW;
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
      // Enhanced completion tracking
      completion: {
        percentage: Math.round((completedSteps / totalSteps) * 100),
        completedSteps,
        totalSteps,
        allStepsCompleted,
        pendingRequirements,
        stepRequirements,
      },
      // Enhanced document information
      documents: {
        status: overallDocumentStatus,
        totalRequired: 3,
        totalUploaded: uploadedDocuments.length,
        totalMissing: missingDocuments.length,
        missingDocumentTypes,
        details: documentStatus,
        uploadedAt: organizer.verificationDocuments?.uploadedAt || null,
      },
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
