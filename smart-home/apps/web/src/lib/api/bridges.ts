import { api } from './client';

export interface DiscoveredBridge {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
}

export interface Bridge {
  id: string;
  name: string;
  ipAddress: string;
  bridgeId: string;
  applicationKey: string;
  modelId?: string;
  apiVersion?: string;
  discoveredAt: string;
  lastSeen: string;
}

export async function discoverBridges(): Promise<DiscoveredBridge[]> {
  const result = await api.post<{ bridges: DiscoveredBridge[] }>('/bridges/discover');
  return result.bridges;
}

export function getBridges(): Promise<Bridge[]> {
  return api.get<Bridge[]>('/bridges');
}

export function pairBridge(ipAddress: string): Promise<Bridge> {
  return api.post<Bridge>('/bridges/pair', { ipAddress });
}
