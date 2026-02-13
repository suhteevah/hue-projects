import { Injectable, Logger } from '@nestjs/common';
import { HueHttpClient } from './hue-http-client.service';
import { HueBridgeService } from './hue-bridge.service';

@Injectable()
export class HueSceneService {
  private readonly logger = new Logger(HueSceneService.name);

  constructor(
    private readonly httpClient: HueHttpClient,
    private readonly bridgeService: HueBridgeService,
  ) {}

  async getAllScenes(bridgeId?: string) {
    const conn = await this.bridgeService.getConnection(bridgeId);
    return this.httpClient.get(conn, '/scene');
  }

  async getScene(sceneId: string, bridgeId?: string) {
    const conn = await this.bridgeService.getConnection(bridgeId);
    const scenes = await this.httpClient.get(conn, `/scene/${sceneId}`);
    return Array.isArray(scenes) ? scenes[0] : scenes;
  }

  async activateScene(sceneId: string, bridgeId?: string) {
    const conn = await this.bridgeService.getConnection(bridgeId);
    return this.httpClient.put(conn, `/scene/${sceneId}`, {
      recall: { action: 'active' },
    });
  }

  async activateDynamicScene(sceneId: string, bridgeId?: string) {
    const conn = await this.bridgeService.getConnection(bridgeId);
    return this.httpClient.put(conn, `/scene/${sceneId}`, {
      recall: { action: 'dynamic_palette' },
    });
  }

  async createScene(
    name: string,
    groupRid: string,
    actions: Array<{
      target: { rid: string; rtype: string };
      action: Record<string, any>;
    }>,
    bridgeId?: string,
  ) {
    const conn = await this.bridgeService.getConnection(bridgeId);
    return this.httpClient.post(conn, '/scene', {
      metadata: { name },
      group: { rid: groupRid, rtype: 'room' },
      actions,
    });
  }
}
