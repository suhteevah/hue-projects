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
