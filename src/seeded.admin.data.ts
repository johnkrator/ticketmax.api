import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from './entity_modules/user/entities/user.entity';
import { UserRole, UserStatus } from './enums/user-role';

@Injectable()
export class AdminSeederService implements OnModuleInit {
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

    const existingAdmin = await this.userModel.findOne({
      email: adminEmail,
      role: UserRole.ADMIN,
    });

    if (!existingAdmin) {
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
    }
  }
}
