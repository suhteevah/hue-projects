import { Injectable, Logger } from '@nestjs/common';

export interface DiscoveredBridge {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  async discoverBridges(): Promise<DiscoveredBridge[]> {
    const results = await Promise.allSettled([
      this.discoverViaMdns(),
      this.discoverViaNupnp(),
    ]);

    const bridges: DiscoveredBridge[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        bridges.push(...result.value);
      }
    }

    // Deduplicate by bridge id
    const seen = new Set<string>();
    const unique = bridges.filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

    this.logger.log(`Discovered ${unique.length} Hue bridge(es)`);
    return unique;
  }

  private async discoverViaMdns(): Promise<DiscoveredBridge[]> {
    try {
      // Dynamic import because node-dns-sd is a CJS module
      const mDnsSd = await import('node-dns-sd');
      const discover = mDnsSd.default?.discover || mDnsSd.discover;

      const devices = await discover({
        name: '_hue._tcp.local',
        wait: 5,
      });

      return devices.map((device: any) => ({
        id: device.address || device.fqdn || 'unknown',
        name: device.modelName || device.fqdn || 'Hue Bridge',
        ipAddress: device.address,
        port: device.service?.port || 443,
      }));
    } catch (err) {
      this.logger.warn(`mDNS discovery failed: ${err}`);
      return [];
    }
  }

  private async discoverViaNupnp(): Promise<DiscoveredBridge[]> {
    try {
      const response = await fetch('https://discovery.meethue.com/');
      if (!response.ok) {
        throw new Error(`N-UPnP returned ${response.status}`);
      }

      const data = (await response.json()) as Array<{
        id: string;
        internalipaddress: string;
        port?: number;
      }>;

      return data.map((entry) => ({
        id: entry.id,
        name: `Hue Bridge (${entry.id.slice(-6)})`,
        ipAddress: entry.internalipaddress,
        port: entry.port || 443,
      }));
    } catch (err) {
      this.logger.warn(`N-UPnP discovery failed: ${err}`);
      return [];
    }
  }
}
