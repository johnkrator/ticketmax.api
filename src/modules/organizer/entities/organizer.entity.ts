import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type OrganizerDocument = Organizer & Document;

export enum OrganizationType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
  NONPROFIT = 'nonprofit',
}

export enum VerificationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REQUIRES_ADDITIONAL_INFO = 'requires_additional_info',
}

export enum EventExperience {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  EXPERIENCED = 'experienced',
}

export enum ExpectedEventVolume {
  LOW = '1-5',
  MEDIUM = '6-15',
  HIGH = '16+',
}

@Schema()
export class PersonalInformation {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  dateOfBirth: Date;
}

@Schema()
export class OrganizationDetails {
  @Prop({ required: true, enum: OrganizationType })
  organizationType: OrganizationType;

  @Prop()
  organizationName?: string;

  @Prop()
  businessRegistrationNumber?: string;

  @Prop()
  taxId?: string;

  @Prop()
  website?: string;

  @Prop({ required: true })
  description: string;
}

@Schema()
export class Address {
  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  zipCode: string;

  @Prop({ required: true })
  country: string;
}

@Schema()
export class VerificationDocuments {
  @Prop()
  idDocumentUrl?: string;

  @Prop()
  businessLicenseUrl?: string;

  @Prop()
  taxDocumentUrl?: string;

  @Prop({ default: Date.now })
  uploadedAt: Date;
}

@Schema()
export class BankingInformation {
  @Prop({ required: true })
  bankName: string;

  @Prop({ required: true })
  accountNumber: string; // This should be encrypted

  @Prop({ required: true })
  routingNumber: string;

  @Prop({ required: true })
  accountHolderName: string;

  @Prop({ default: false })
  isVerified: boolean;
}

@Schema()
export class ExperienceDetails {
  @Prop({ required: true, enum: EventExperience })
  eventExperience: EventExperience;

  @Prop()
  previousEvents?: string;

  @Prop({ required: true, enum: ExpectedEventVolume })
  expectedEventVolume: ExpectedEventVolume;
}

@Schema({ timestamps: true })
export class Organizer {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @ApiProperty({
    description: 'User ID associated with this organizer profile',
  })
  userId: Types.ObjectId;

  @Prop({ type: PersonalInformation, required: true })
  personalInformation: PersonalInformation;

  @Prop({ type: OrganizationDetails, required: true })
  organizationDetails: OrganizationDetails;

  @Prop({ type: Address, required: true })
  address: Address;

  @Prop({ type: VerificationDocuments })
  verificationDocuments?: VerificationDocuments;

  @Prop({ type: BankingInformation })
  bankingInformation?: BankingInformation;

  @Prop({ type: ExperienceDetails })
  experienceDetails?: ExperienceDetails;

  @Prop({
    type: String,
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus;

  @Prop({ default: false })
  isActive: boolean;

  @Prop()
  rejectionReason?: string;

  @Prop()
  verifiedAt?: Date;

  @Prop()
  reviewedBy?: string; // Admin ID who reviewed

  @Prop({ default: 0 })
  currentStep: number; // Track onboarding progress

  @Prop({ default: false })
  isOnboardingComplete: boolean;

  // Relationship fields for events
  @Prop([{ type: Types.ObjectId, ref: 'Event' }])
  @ApiProperty({
    description: 'Events created by this organizer',
    required: false,
  })
  events: Types.ObjectId[];

  @Prop({ type: Object })
  @ApiProperty({ description: 'Organizer statistics', required: false })
  statistics?: {
    totalEvents: number;
    totalTicketsSold: number;
    totalRevenue: number;
    averageRating: number;
    totalAttendees: number;
  };
}

export const OrganizerSchema = SchemaFactory.createForClass(Organizer);

// Index for better query performance (removed duplicate email index)
// The email index is already created by the unique: true property in PersonalInformation
OrganizerSchema.index({ userId: 1 }); // Index for user relationship
OrganizerSchema.index({ verificationStatus: 1 });
OrganizerSchema.index({ isActive: 1 });
OrganizerSchema.index({ 'personalInformation.email': 1 }); // Re-add for queries
