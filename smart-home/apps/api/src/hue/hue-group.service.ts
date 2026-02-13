import { Injectable, Logger } from '@nestjs/common';
import { HueHttpClient } from './hue-http-client.service';
import { HueBridgeService } from './hue-bridge.service';
import type { HueLightState } from './hue-light.service';

@Injectable()
export class HueGroupService {
  private readonly logger = new Logger(HueGroupService.name);

  constructor(
    private readonly httpClient: HueHttpClient,
    private readonly bridgeService: HueBridgeService,
  ) {}

  async getAllGroups(bridgeId?: string) {
    const conn = await this.bridgeService.getConnection(bridgeId);
    return this.httpClient.get(conn, '/grouped_light');
  }

  async getGroup(groupId: string, bridgeId?: string) {
    const conn = await this.bridgeService.getConnection(bridgeId);
    const groups = await this.httpClient.get(
      conn,
      `/grouped_light/${groupId}`,
    );
    return Array.isArray(groups) ? groups[0] : groups;
  }

  async setGroupState(
    groupId: string,
    state: HueLightState,
    bridgeId?: string,
  ) {
    const conn = await this.bridgeService.getConnection(bridgeId);
    return this.httpClient.put(conn, `/grouped_light/${groupId}`, state);
  }

  async getAllRooms(bridgeId?: string) {
    const conn = await this.bridgeService.getConnection(bridgeId);
    return this.httpClient.get(conn, '/room');
  }

  async getRoom(roomId: string, bridgeId?: string) {
    const conn = await this.bridgeService.getConnection(bridgeId);
    const rooms = await this.httpClient.get(conn, `/room/${roomId}`);
    return Array.isArray(rooms) ? rooms[0] : rooms;
  }

  async getAllZones(bridgeId?: string) {
    const conn = await this.bridgeService.getConnection(bridgeId);
    return this.httpClient.get(conn, '/zone');
  }
}
