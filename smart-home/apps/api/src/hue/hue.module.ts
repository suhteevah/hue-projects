import { Module } from '@nestjs/common';
import { HueBridgeService } from './hue-bridge.service';
import { HueHttpClient } from './hue-http-client.service';
import { HueLightService } from './hue-light.service';
import { HueGroupService } from './hue-group.service';
import { HueSceneService } from './hue-scene.service';
import { HueEventService } from './hue-event.service';
import { HueBridgeController } from './hue-bridge.controller';
import { AuthModule } from '../auth/auth.module';
import { DiscoveryModule } from '../discovery/discovery.module';

@Module({
  imports: [AuthModule, DiscoveryModule],
  providers: [
    HueBridgeService,
    HueHttpClient,
    HueLightService,
    HueGroupService,
    HueSceneService,
    HueEventService,
  ],
  controllers: [HueBridgeController],
  exports: [
    HueBridgeService,
    HueHttpClient,
    HueLightService,
    HueGroupService,
    HueSceneService,
    HueEventService,
  ],
})
export class HueModule {}
