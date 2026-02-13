import type { DeviceType, DeviceState, LightCapabilities } from '@smart-home/shared-types';

/**
 * Raw information extracted from a Matter node after commissioning.
 */
export interface MatterDeviceInfo {
  nodeId: string;
  name: string;
  vendorId?: number;
  productId?: number;
  deviceType: string;
  serialNumber?: string;
  endpointId: number;
}

/**
 * Capabilities as read from Matter cluster feature maps.
 */
export interface MatterDeviceCapabilities {
  supportsOnOff: boolean;
  supportsBrightness: boolean;
  supportsColor: boolean;
  supportsColorTemperature: boolean;
}

/**
 * Options for commissioning a Matter device.
 */
export interface CommissionOptions {
  pairingCode: string;
}

/**
 * Mapped device type and capabilities for the unified device model.
 */
export interface MappedDeviceInfo {
  type: DeviceType;
  capabilities: LightCapabilities;
}
