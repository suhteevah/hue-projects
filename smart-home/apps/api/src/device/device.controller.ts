import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { IsOptional, IsBoolean, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class XYColorDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number;
}

class SetDeviceStateDto {
  @IsOptional()
  @IsBoolean()
  on?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  brightness?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => XYColorDto)
  color?: XYColorDto;

  @IsOptional()
  @IsNumber()
  @Min(153)
  @Max(500)
  colorTemperature?: number;
}

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  async getAll() {
    return this.deviceService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.deviceService.getById(id);
  }

  @Put(':id/state')
  async setState(
    @Param('id') id: string,
    @Body() dto: SetDeviceStateDto,
  ) {
    await this.deviceService.setState(id, dto);
    return { success: true };
  }

  @Post('sync')
  async sync() {
    await this.deviceService.syncDevices();
    return { success: true };
  }
}
