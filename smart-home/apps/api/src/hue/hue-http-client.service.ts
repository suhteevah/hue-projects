import { Injectable, Logger } from '@nestjs/common';
import { Agent, fetch as undiciFetch } from 'undici';

export interface HueBridgeConnection {
  ipAddress: string;
  applicationKey: string;
}

@Injectable()
export class HueHttpClient {
  private readonly logger = new Logger(HueHttpClient.name);

  // Allow self-signed certs from the Hue bridge (local network only)
  private readonly agent = new Agent({
    connect: { rejectUnauthorized: false },
  });

  async request<T = any>(
    connection: HueBridgeConnection,
    method: string,
    path: string,
    body?: Record<string, any>,
  ): Promise<T> {
    const url = `https://${connection.ipAddress}/clip/v2/resource${path}`;

    this.logger.debug(`${method} ${url}`);

    const response = await undiciFetch(url, {
      method,
      headers: {
        'hue-application-key': connection.applicationKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      dispatcher: this.agent,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Hue API error ${response.status}: ${errorText}`);
      throw new Error(`Hue API error ${response.status}: ${errorText}`);
    }

    const json = (await response.json()) as any;
    return json.data ?? json;
  }

  async get<T = any>(
    connection: HueBridgeConnection,
    path: string,
  ): Promise<T> {
    return this.request<T>(connection, 'GET', path);
  }

  async put<T = any>(
    connection: HueBridgeConnection,
    path: string,
    body: Record<string, any>,
  ): Promise<T> {
    return this.request<T>(connection, 'PUT', path, body);
  }

  async post<T = any>(
    connection: HueBridgeConnection,
    path: string,
    body: Record<string, any>,
  ): Promise<T> {
    return this.request<T>(connection, 'POST', path, body);
  }

  /**
   * Pair with a Hue bridge by pressing the link button and calling this method.
   * Uses the legacy v1 API endpoint for key generation.
   */
  async pairWithBridge(
    ipAddress: string,
    appName: string = 'smart-home',
    deviceName: string = 'api',
  ): Promise<{ applicationKey: string; clientKey: string }> {
    const url = `https://${ipAddress}/api`;

    const response = await undiciFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        devicetype: `${appName}#${deviceName}`,
        generateclientkey: true,
      }),
      dispatcher: this.agent,
    });

    const data = (await response.json()) as any[];

    if (data[0]?.error) {
      const error = data[0].error;
      throw new Error(
        `Bridge pairing failed (type ${error.type}): ${error.description}`,
      );
    }

    const success = data[0]?.success;
    if (!success) {
      throw new Error('Unexpected response from bridge pairing');
    }

    return {
      applicationKey: success.username,
      clientKey: success.clientkey || '',
    };
  }
}
