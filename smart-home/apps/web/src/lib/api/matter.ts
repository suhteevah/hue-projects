import { api } from './client';

export interface MatterNode {
  id: string;
  nodeId: string;
  name: string;
  vendorId?: number;
  productId?: number;
  deviceType: string;
  serialNumber?: string;
  commissioned: boolean;
  commissionedAt: string;
  lastSeen: string;
}

export interface BridgeStatus {
  id: string;
  name: string;
  ipAddress: string;
  bridgeId: string;
  modelId?: string;
  apiVersion?: string;
  lastSeen: string;
  deviceCount: number;
}

export interface SmartHomeStatus {
  bridges: BridgeStatus[];
  matterNodes: MatterNode[];
  totals: {
    bridges: number;
    matterNodes: number;
    hueDevices: number;
    matterDevices: number;
    totalDevices: number;
  };
}

export function getSmartHomeStatus(): Promise<SmartHomeStatus> {
  return api.get<SmartHomeStatus>('/matter/status');
}

export function getMatterNodes(): Promise<MatterNode[]> {
  return api.get<MatterNode[]>('/matter/nodes');
}

export function commissionMatterDevice(pairingCode: string): Promise<MatterNode> {
  return api.post<MatterNode>('/matter/commission', { pairingCode });
}

export function decommissionMatterDevice(nodeId: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/matter/nodes/${nodeId}`);
}
