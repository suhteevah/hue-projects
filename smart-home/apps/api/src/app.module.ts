import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { HueModule } from './hue/hue.module';
import { MatterModule } from './matter/matter.module';
import { DeviceModule } from './device/device.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuthModule,
    DiscoveryModule,
    HueModule,
    MatterModule,
    DeviceModule,
  ],
})
export class AppModule {}
