import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { HueBridgeService } from './hue-bridge.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { IsString, IsIP } from 'class-validator';

class PairBridgeDto {
  @IsString()
  @IsIP()
  ipAddress!: string;
}

@Controller('bridges')
@UseGuards(JwtAuthGuard)
export class HueBridgeController {
  constructor(private readonly bridgeService: HueBridgeService) {}

  @Get()
  async listBridges() {
    return this.bridgeService.listPairedBridges();
  }

  @Post('pair')
  async pairBridge(@Body() dto: PairBridgeDto) {
    return this.bridgeService.pair(dto.ipAddress);
  }
}
