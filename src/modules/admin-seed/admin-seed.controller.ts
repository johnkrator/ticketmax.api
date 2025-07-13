import { Controller } from '@nestjs/common';
import { AdminSeedService } from './admin-seed.service';

@Controller('admin-seed')
export class AdminSeedController {
  constructor(private readonly adminSeedService: AdminSeedService) {}
}
