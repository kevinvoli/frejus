import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StorageService } from './storage.service';

// Usage interne au panneau admin uniquement (tableau de bord "Stockage").
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly service: StorageService) {}

  @Get()
  getOverview() {
    return this.service.getOverview();
  }
}
