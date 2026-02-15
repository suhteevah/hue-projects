import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { MatterNodeService } from './matter-node.service';
import { MatterEventService } from './matter-event.service';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNotEmpty } from 'class-validator';

class CommissionDto {
  @IsString()
  @IsNotEmpty()
  pairingCode!: string;
}

@Controller('matter')
@UseGuards(JwtAuthGuard)
export class MatterController {
  constructor(
    private readonly matterNodeService: MatterNodeService,
    private readonly matterEventService: MatterEventService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /api/matter/nodes
   * List all commissioned Matter nodes.
   */
  @Get('nodes')
  async listNodes() {
    return this.matterNodeService.listNodes();
  }

  /**
   * GET /api/matter/status
   * Returns a unified overview: paired Hue bridges with device counts + Matter nodes.
   */
  @Get('status')
  async getStatus() {
    const [bridges, matterNodes, devices] = await Promise.all([
      this.prisma.hueBridge.findMany({ orderBy: { lastSeen: 'desc' } }),
      this.prisma.matterNode.findMany({ orderBy: { commissionedAt: 'desc' } }),
      this.prisma.device.findMany({ select: { source: true, externalId: true } }),
    ]);

    const hueDeviceCount = devices.filter((d) => d.source === 'hue').length;
    const matterDeviceCount = devices.filter((d) => d.source === 'matter').length;

    return {
      bridges: bridges.map((b) => ({
        id: b.id,
        name: b.name,
        ipAddress: b.ipAddress,
        bridgeId: b.bridgeId,
        modelId: b.modelId,
        apiVersion: b.apiVersion,
        lastSeen: b.lastSeen.toISOString(),
        deviceCount: hueDeviceCount,
      })),
      matterNodes: matterNodes.map((n) => ({
        id: n.id,
        nodeId: n.nodeId,
        name: n.name,
        vendorId: n.vendorId,
        productId: n.productId,
        deviceType: n.deviceType,
        serialNumber: n.serialNumber,
        commissioned: n.commissioned,
        commissionedAt: n.commissionedAt.toISOString(),
        lastSeen: n.lastSeen.toISOString(),
      })),
      totals: {
        bridges: bridges.length,
        matterNodes: matterNodes.length,
        hueDevices: hueDeviceCount,
        matterDevices: matterDeviceCount,
        totalDevices: hueDeviceCount + matterDeviceCount,
      },
    };
  }

  /**
   * POST /api/matter/commission
   * Commission a new Matter device using a pairing code.
   */
  @Post('commission')
  async commission(@Body() dto: CommissionDto) {
    const node = await this.matterNodeService.commissionNode(dto.pairingCode);

    // Subscribe to events from the newly commissioned node
    try {
      await this.matterEventService.subscribeAll();
    } catch {
      // Non-critical — events will be subscribed on next restart
    }

    return node;
  }

  /**
   * DELETE /api/matter/nodes/:id
   * Decommission and remove a Matter device.
   */
  @Delete('nodes/:id')
  async decommission(@Param('id') id: string) {
    await this.matterNodeService.decommissionNode(id);
    return { success: true };
  }
}
