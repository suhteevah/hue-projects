import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('bridges')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Post('discover')
  @UseGuards(JwtAuthGuard)
  async discover() {
    const bridges = await this.discoveryService.discoverBridges();
    return { bridges };
  }
}
