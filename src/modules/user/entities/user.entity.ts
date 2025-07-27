import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';
import { BaseEntity } from '../../base-entity';
import { UserRole, UserStatus } from '../../../enums/user-role';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User extends BaseEntity {
  @Prop({ required: true, trim: true })
  @ApiProperty({ description: 'First name' })
  firstName: string;

  @Prop({ required: true, trim: true })
  @ApiProperty({ description: 'Last name' })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  @ApiProperty({ description: 'Email address' })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ unique: true, sparse: true, trim: true })
  @ApiProperty({ description: 'Phone number', required: false })
  phone?: string;

  @Prop({ trim: true })
  @ApiProperty({ description: 'Profile picture URL', required: false })
  avatar?: string;

  @Prop({ type: Date })
  @ApiProperty({ description: 'Date of birth', required: false })
  dateOfBirth?: Date;

  @Prop({ trim: true })
  @ApiProperty({ description: 'User bio', required: false })
  bio?: string;

  @Prop({
    enum: Object.values(UserRole),
    default: UserRole.USER,
  })
  @ApiProperty({ enum: UserRole, description: 'User role' })
  role: UserRole;

  @Prop({
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE,
  })
  @ApiProperty({ enum: UserStatus, description: 'User status' })
  status: UserStatus;

  @Prop({ default: false })
  @ApiProperty({ description: 'Email verification status' })
  emailVerified: boolean;

  @Prop({ default: false })
  @ApiProperty({ description: 'Phone verification status' })
  phoneVerified: boolean;

  @Prop({ default: false })
  @ApiProperty({ description: 'Whether this is a guest user account' })
  isGuest: boolean;

  @Prop()
  @ApiProperty({ description: 'Email verification token', required: false })
  emailVerificationToken?: string;

  @Prop()
  @ApiProperty({ description: 'Password reset token', required: false })
  passwordResetToken?: string;

  @Prop({ type: Date })
  @ApiProperty({ description: 'Password reset expires', required: false })
  passwordResetExpires?: Date;

  @Prop({ type: Date })
  @ApiProperty({ description: 'Last login date', required: false })
  lastLogin?: Date;

  @Prop({ default: 0 })
  @ApiProperty({ description: 'Login attempts count' })
  loginAttempts: number;

  @Prop({ type: Date })
  @ApiProperty({ description: 'Account locked until', required: false })
  lockUntil?: Date;

  @Prop({ type: Object })
  @ApiProperty({ description: 'User preferences', required: false })
  preferences?: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    theme: string;
    language: string;
  };

  @Prop({ type: Object })
  @ApiProperty({ description: 'User address', required: false })
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  @Prop([
    {
      provider: {
        type: String,
        enum: ['google', 'github', 'facebook', 'apple'],
      },
      providerId: { type: String },
      connectedAt: { type: Date, default: Date.now },
    },
  ])
  @ApiProperty({
    description: 'OAuth providers linked to this account',
    required: false,
  })
  oauthProviders?: {
    provider: 'google' | 'github' | 'facebook' | 'apple';
    providerId: string;
    connectedAt: Date;
  }[];

  @ApiProperty({ description: 'Full name' })
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @ApiProperty({ description: 'Is account locked' })
  get isLocked(): boolean {
    return !!(this.lockUntil && this.lockUntil > new Date());
  }

  // Relationship fields
  @Prop({ type: Types.ObjectId, ref: 'Organizer' })
  @ApiProperty({ description: 'Associated organizer profile', required: false })
  organizerId?: Types.ObjectId;

  // User's bookings relationship (virtual field for population)
  @Prop([{ type: Types.ObjectId, ref: 'Booking' }])
  @ApiProperty({ description: 'User bookings', required: false })
  bookings?: Types.ObjectId[];

  // User's payments relationship (virtual field for population)
  @Prop([{ type: Types.ObjectId, ref: 'Payment' }])
  @ApiProperty({ description: 'User payments', required: false })
  payments?: Types.ObjectId[];

  // Events created by user (if user is an organizer)
  @Prop([{ type: Types.ObjectId, ref: 'Event' }])
  @ApiProperty({ description: 'Events created by user', required: false })
  createdEvents?: Types.ObjectId[];

  // Events favorited by user
  @Prop([{ type: Types.ObjectId, ref: 'Event' }])
  @ApiProperty({ description: 'Events favorited by user', required: false })
  favoritedEvents?: Types.ObjectId[];

  // Events user is attending
  @Prop([{ type: Types.ObjectId, ref: 'Event' }])
  @ApiProperty({ description: 'Events user is attending', required: false })
  attendingEvents?: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Virtual for fullName
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for isLocked
UserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// Only add indexes that aren't already unique in the @Prop
// Removed _id index as it's not allowed by MongoDB
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });

// Compound indexes for better query performance
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ emailVerified: 1, phoneVerified: 1 });
UserSchema.index({ lastLogin: -1 });
