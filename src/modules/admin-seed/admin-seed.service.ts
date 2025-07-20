import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../user/entities/user.entity';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UserRole, UserStatus } from '../../enums/user-role';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedAdminUser();
  }

  private async seedAdminUser() {
    const adminEmail = this.configService.get(
      'ADMIN_EMAIL',
      'admin@example.com',
    );
    const adminPassword = this.configService.get('ADMIN_PASSWORD', 'Admin123!');

    // Check if any user with this email exists (regardless of role)
    const existingUser = await this.userModel.findOne({
      email: adminEmail,
    });

    if (!existingUser) {
      try {
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        const adminUser = new this.userModel({
          firstName: 'System',
          lastName: 'Administrator',
          email: adminEmail,
          password: hashedPassword,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          emailVerified: true,
        });

        await adminUser.save();
        console.log('Admin user seeded successfully');
      } catch (error) {
        if (error.code === 11000) {
          console.log('Admin user already exists');
        } else {
          console.error('Error seeding admin user:', error);
        }
      }
    } else {
      console.log('User with admin email already exists');
      // Optionally update their role to admin if they're not already
      if (existingUser.role !== UserRole.ADMIN) {
        existingUser.role = UserRole.ADMIN;
        existingUser.status = UserStatus.ACTIVE;
        existingUser.emailVerified = true;
        await existingUser.save();
        console.log('Updated existing user to admin role');
      }
    }
  }
}
