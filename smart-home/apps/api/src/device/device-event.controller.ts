import { Controller, Get, Req, Res, Logger, Query } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { HueEventService } from '../hue/hue-event.service';
import { MatterEventService } from '../matter/matter-event.service';
import { merge, Subscription } from 'rxjs';

@Controller('events')
export class DeviceEventController {
  private readonly logger = new Logger(DeviceEventController.name);

  constructor(
    private readonly hueEventService: HueEventService,
    private readonly matterEventService: MatterEventService,
  ) {}

  @Get('stream')
  async stream(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('token') _token?: string,
  ) {
    // TODO: validate JWT token from query param for SSE auth

    const raw = reply.raw;
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial heartbeat
    raw.write('data: {"type":"connected"}\n\n');

    // Subscribe to all device events (Hue + Matter) and forward to client
    const allEvents$ = merge(
      this.hueEventService.events$,
      this.matterEventService.events$,
    );
    const subscription: Subscription = allEvents$.subscribe((event) => {
      raw.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    // Heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
      raw.write(': heartbeat\n\n');
    }, 30000);

    // Clean up on client disconnect
    req.raw.on('close', () => {
      subscription.unsubscribe();
      clearInterval(heartbeat);
      this.logger.debug('SSE client disconnected');
    });
  }
}
