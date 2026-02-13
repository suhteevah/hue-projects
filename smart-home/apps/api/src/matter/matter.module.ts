import { Module } from '@nestjs/common';
import { MatterControllerService } from './matter-controller.service';
import { MatterNodeService } from './matter-node.service';
import { MatterDeviceService } from './matter-device.service';
import { MatterEventService } from './matter-event.service';
import { MatterController } from './matter.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [
    MatterControllerService,
    MatterNodeService,
    MatterDeviceService,
    MatterEventService,
  ],
  controllers: [MatterController],
  exports: [
    MatterControllerService,
    MatterNodeService,
    MatterDeviceService,
    MatterEventService,
  ],
})
export class MatterModule {}
