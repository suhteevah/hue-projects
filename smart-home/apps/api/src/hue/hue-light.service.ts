import { Injectable, Logger } from '@nestjs/common';
import { HueHttpClient, HueBridgeConnection } from './hue-http-client.service';
import { HueBridgeService } from './hue-bridge.service';

export interface HueLightState {
  on?: { on: boolean };
  dimming?: { brightness: number };
  color?: { xy: { x: number; y: number } };
  color_temperature?: { mirek: number | null };
  dynamics?: { duration: number };
}

@Injectable()
export class HueLightService {
  private readonly logger = new Logger(HueLightService.name);

  constructor(
    private readonly httpClient: HueHttpClient,
    private readonly bridgeService: HueBridgeService,
  ) {}

  async getAllLights(bridgeId?: string) {
    const conn = await this.bridgeService.getConnection(bridgeId);
    return this.httpClient.get(conn, '/light');
  }

  async getLight(lightId: string, bridgeId?: string) {
    const conn = await this.bridgeService.getConnection(bridgeId);
    const lights = await this.httpClient.get(conn, `/light/${lightId}`);
    return Array.isArray(lights) ? lights[0] : lights;
  }

  async setLightState(
    lightId: string,
    state: HueLightState,
    bridgeId?: string,
  ) {
    const conn = await this.bridgeService.getConnection(bridgeId);
    return this.httpClient.put(conn, `/light/${lightId}`, state);
  }

  async turnOn(lightId: string, bridgeId?: string) {
    return this.setLightState(lightId, { on: { on: true } }, bridgeId);
  }

  async turnOff(lightId: string, bridgeId?: string) {
    return this.setLightState(lightId, { on: { on: false } }, bridgeId);
  }

  async setBrightness(
    lightId: string,
    brightness: number,
    bridgeId?: string,
  ) {
    return this.setLightState(
      lightId,
      {
        on: { on: true },
        dimming: { brightness: Math.max(0, Math.min(100, brightness)) },
      },
      bridgeId,
    );
  }

  async setColor(
    lightId: string,
    x: number,
    y: number,
    bridgeId?: string,
  ) {
    return this.setLightState(
      lightId,
      { on: { on: true }, color: { xy: { x, y } } },
      bridgeId,
    );
  }

  async setColorTemperature(
    lightId: string,
    mirek: number,
    bridgeId?: string,
  ) {
    // Hue supports 153-500 mirek range
    const clamped = Math.max(153, Math.min(500, mirek));
    return this.setLightState(
      lightId,
      { on: { on: true }, color_temperature: { mirek: clamped } },
      bridgeId,
    );
  }
}
