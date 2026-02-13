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

export function getMatterNodes(): Promise<MatterNode[]> {
  return api.get<MatterNode[]>('/matter/nodes');
}

export function commissionMatterDevice(pairingCode: string): Promise<MatterNode> {
  return api.post<MatterNode>('/matter/commission', { pairingCode });
}

export function decommissionMatterDevice(nodeId: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/matter/nodes/${nodeId}`);
}
