declare module 'node-dns-sd' {
  interface DiscoverOptions {
    name: string;
    wait?: number;
    quick?: boolean;
  }

  interface DiscoveredDevice {
    address: string;
    fqdn: string;
    modelName?: string;
    service?: {
      port: number;
      protocol: string;
      type: string;
    };
    packet?: any;
  }

  export function discover(
    options: DiscoverOptions,
  ): Promise<DiscoveredDevice[]>;
}
