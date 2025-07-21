import { Injectable, BadRequestException } from '@nestjs/common';
import { OrganizationType } from './entities/organizer.entity';

@Injectable()
export class OrganizerValidationService {
  // Validate step completion based on an organization type
  validateStepCompletion(
    step: number,
    data: any,
    organizationType: OrganizationType,
  ): boolean {
    switch (step) {
      case 1: // Personal Information
        return this.validatePersonalInformation(data);
      case 2: // Organization Details
        return this.validateOrganizationDetails(data, organizationType);
      case 3: // Address
        return this.validateAddress(data);
      case 4: // Documents
        return this.validateDocuments(data, organizationType);
      case 5: // Banking
        return this.validateBankingInformation(data);
      case 6: // Experience
        return this.validateExperience(data);
      default:
        return false;
    }
  }

  // Validate business requirements for different organization types
  validateBusinessRequirements(
    organizationType: OrganizationType,
    data: any,
  ): void {
    if (organizationType === OrganizationType.COMPANY) {
      if (!data.businessRegistrationNumber) {
        throw new BadRequestException(
          'Business registration number is required for companies',
        );
      }
      if (!data.taxId) {
        throw new BadRequestException('Tax ID is required for companies');
      }
    }

    if (organizationType === OrganizationType.NONPROFIT) {
      if (!data.taxId) {
        throw new BadRequestException(
          'Tax ID is required for non-profit organizations',
        );
      }
    }
  }

  // Validate a banking information format
  validateBankingFormat(bankingInfo: any): void {
    // Validate routing number (US format - 9 digits)
    if (!/^\d{9}$/.test(bankingInfo.routingNumber)) {
      throw new BadRequestException('Invalid routing number format');
    }

    // Validate account number (8-20 digits)
    if (!/^\d{8,20}$/.test(bankingInfo.accountNumber)) {
      throw new BadRequestException('Invalid account number format');
    }
  }

  // Validate file uploads
  validateFileUpload(file: any, maxSizeBytes: number = 5 * 1024 * 1024): void {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and PDF files are allowed',
      );
    }

    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `File size exceeds ${maxSizeBytes / (1024 * 1024)}MB limit`,
      );
    }
  }

  // Check if the organizer meets minimum requirements for approval
  checkApprovalEligibility(organizer: any): {
    eligible: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    if (!organizer.isOnboardingComplete) {
      reasons.push('Onboarding process not completed');
    }

    if (!organizer.verificationDocuments?.idDocumentUrl) {
      reasons.push('ID document not uploaded');
    }

    if (
      organizer.organizationDetails.organizationType !==
      OrganizationType.INDIVIDUAL
    ) {
      if (!organizer.verificationDocuments?.businessLicenseUrl) {
        reasons.push('Business license not uploaded');
      }
      if (!organizer.verificationDocuments?.taxDocumentUrl) {
        reasons.push('Tax document not uploaded');
      }
    }

    if (!organizer.bankingInformation) {
      reasons.push('Banking information not provided');
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    };
  }

  private validatePersonalInformation(data: any): boolean {
    return !!(
      data.firstName &&
      data.lastName &&
      data.email &&
      data.phone &&
      data.dateOfBirth
    );
  }

  private validateOrganizationDetails(
    data: any,
    organizationType: OrganizationType,
  ): boolean {
    const baseValid = !!(data.organizationType && data.description);

    if (organizationType === OrganizationType.INDIVIDUAL) {
      return baseValid;
    }

    return baseValid && !!data.organizationName;
  }

  private validateAddress(data: any): boolean {
    return !!(
      data.address &&
      data.city &&
      data.state &&
      data.zipCode &&
      data.country
    );
  }

  private validateDocuments(
    data: any,
    organizationType: OrganizationType,
  ): boolean {
    if (!data.idDocumentUrl) return false;

    if (organizationType !== OrganizationType.INDIVIDUAL) {
      return !!(data.businessLicenseUrl && data.taxDocumentUrl);
    }

    return true;
  }

  private validateBankingInformation(data: any): boolean {
    return !!(
      data.bankName &&
      data.accountNumber &&
      data.routingNumber &&
      data.accountHolderName
    );
  }

  private validateExperience(data: any): boolean {
    return !!(data.eventExperience && data.expectedEventVolume);
  }
}
