import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HueHttpClient, HueBridgeConnection } from './hue-http-client.service';
import { DiscoveryService } from '../discovery/discovery.service';

@Injectable()
export class HueBridgeService {
  private readonly logger = new Logger(HueBridgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpClient: HueHttpClient,
    private readonly discovery: DiscoveryService,
  ) {}

  async getConnection(bridgeId?: string): Promise<HueBridgeConnection> {
    const bridge = bridgeId
      ? await this.prisma.hueBridge.findUnique({ where: { id: bridgeId } })
      : await this.prisma.hueBridge.findFirst();

    if (!bridge) {
      throw new NotFoundException('No paired Hue bridge found');
    }

    return {
      ipAddress: bridge.ipAddress,
      applicationKey: bridge.applicationKey,
    };
  }

  async listPairedBridges() {
    return this.prisma.hueBridge.findMany({
      orderBy: { lastSeen: 'desc' },
    });
  }

  async pair(ipAddress: string) {
    this.logger.log(`Attempting to pair with bridge at ${ipAddress}`);

    try {
      const { applicationKey, clientKey } =
        await this.httpClient.pairWithBridge(ipAddress);

      // Fetch bridge info after pairing
      const connection: HueBridgeConnection = { ipAddress, applicationKey };
      let bridgeConfig: any;
      try {
        bridgeConfig = await this.httpClient.get(connection, '/bridge');
        bridgeConfig = bridgeConfig?.[0] ?? bridgeConfig;
      } catch {
        bridgeConfig = {};
      }

      const bridgeId =
        bridgeConfig?.bridge_id ?? bridgeConfig?.id ?? ipAddress;

      const bridge = await this.prisma.hueBridge.upsert({
        where: { bridgeId },
        update: {
          ipAddress,
          applicationKey,
          clientKey,
          lastSeen: new Date(),
        },
        create: {
          name: bridgeConfig?.name ?? `Hue Bridge`,
          ipAddress,
          bridgeId,
          applicationKey,
          clientKey,
          modelId: bridgeConfig?.model_id,
          apiVersion: bridgeConfig?.api_version,
        },
      });

      this.logger.log(`Successfully paired with bridge: ${bridge.name}`);
      return bridge;
    } catch (err: any) {
      if (err.message?.includes('type 101')) {
        throw new BadRequestException(
          'Press the link button on your Hue Bridge, then try again within 30 seconds',
        );
      }
      throw err;
    }
  }

  async updateLastSeen(bridgeDbId: string) {
    await this.prisma.hueBridge.update({
      where: { id: bridgeDbId },
      data: { lastSeen: new Date() },
    });
  }
}
