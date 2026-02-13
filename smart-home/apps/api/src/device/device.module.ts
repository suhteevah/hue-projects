import { Module } from '@nestjs/common';
import { DeviceService } from './device.service';
import { DeviceController } from './device.controller';
import { DeviceEventController } from './device-event.controller';
import { HueModule } from '../hue/hue.module';
import { MatterModule } from '../matter/matter.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HueModule, MatterModule, AuthModule],
  providers: [DeviceService],
  controllers: [DeviceController, DeviceEventController],
  exports: [DeviceService],
})
export class DeviceModule {}
