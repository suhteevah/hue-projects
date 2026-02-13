import type { DeviceState, DeviceType, LightCapabilities } from '@smart-home/shared-types';
import type { MappedDeviceInfo } from './interfaces/matter-device-info';

/**
 * Map a Matter device type ID to our unified DeviceType.
 * Common device type IDs from the Matter spec:
 * - 0x0100 (256) = On/Off Light
 * - 0x0101 (257) = Dimmable Light
 * - 0x010C (268) = Color Temperature Light
 * - 0x010D (269) = Extended Color Light
 * - 0x010A (266) = On/Off Plug-in Unit
 * - 0x010B (267) = Dimmable Plug-in Unit
 * - 0x0302 (770) = Temperature Sensor
 * - 0x0106 (262) = Light Sensor
 * - 0x0107 (263) = Occupancy Sensor
 * - 0x0301 (769) = Contact Sensor
 */
export function mapMatterDeviceType(deviceTypeId: number): DeviceType {
  switch (deviceTypeId) {
    case 0x0100: // On/Off Light
    case 0x0101: // Dimmable Light
    case 0x010c: // Color Temperature Light
    case 0x010d: // Extended Color Light
      return 'light';
    case 0x010a: // On/Off Plug-in Unit
    case 0x010b: // Dimmable Plug-in Unit
      return 'plug';
    case 0x0302: // Temperature Sensor
    case 0x0106: // Light Sensor
    case 0x0107: // Occupancy Sensor
      return 'sensor';
    case 0x0301: // Contact Sensor
      return 'contact_sensor';
    default:
      // Default to light for unknown device types that support on/off
      return 'light';
  }
}

/**
 * Map Matter cluster capabilities to our LightCapabilities type.
 */
export function mapMatterCapabilities(
  hasOnOff: boolean,
  hasLevelControl: boolean,
  hasColorControl: boolean,
  hasColorTemperature: boolean,
): LightCapabilities {
  return {
    supportsBrightness: hasLevelControl,
    supportsColor: hasColorControl,
    supportsColorTemperature: hasColorTemperature,
    // Matter color temp uses mireds (same unit as Hue "mirek")
    // Typical range: 153 (6500K) to 500 (2000K)
    minMirek: hasColorTemperature ? 153 : undefined,
    maxMirek: hasColorTemperature ? 500 : undefined,
  };
}

/**
 * Get full mapped device info from a Matter device type ID and cluster analysis.
 */
export function getMappedDeviceInfo(
  deviceTypeId: number,
  hasOnOff: boolean,
  hasLevelControl: boolean,
  hasColorControl: boolean,
  hasColorTemperature: boolean,
): MappedDeviceInfo {
  return {
    type: mapMatterDeviceType(deviceTypeId),
    capabilities: mapMatterCapabilities(
      hasOnOff,
      hasLevelControl,
      hasColorControl,
      hasColorTemperature,
    ),
  };
}

/**
 * Convert Matter LevelControl currentLevel (0–254) to brightness percentage (0–100).
 */
export function matterLevelToBrightness(level: number): number {
  return Math.round((level / 254) * 100);
}

/**
 * Convert brightness percentage (0–100) to Matter LevelControl level (0–254).
 */
export function brightnessToMatterLevel(brightness: number): number {
  return Math.round((brightness / 100) * 254);
}

/**
 * Convert Matter ColorControl currentX/currentY (0–65536) to CIE xy (0.0–1.0).
 */
export function matterXyToDeviceXy(
  matterX: number,
  matterY: number,
): { x: number; y: number } {
  return {
    x: matterX / 65536,
    y: matterY / 65536,
  };
}

/**
 * Convert CIE xy (0.0–1.0) to Matter ColorControl (0–65536).
 */
export function deviceXyToMatterXy(
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: Math.round(x * 65536),
    y: Math.round(y * 65536),
  };
}

/**
 * Build a DeviceState from Matter cluster attribute values.
 */
export function buildDeviceState(attrs: {
  onOff?: boolean;
  currentLevel?: number;
  currentX?: number;
  currentY?: number;
  colorTemperatureMireds?: number;
}): DeviceState {
  const state: DeviceState = {
    reachable: true,
  };

  if (attrs.onOff !== undefined) {
    state.on = attrs.onOff;
  }

  if (attrs.currentLevel !== undefined) {
    state.brightness = matterLevelToBrightness(attrs.currentLevel);
  }

  if (attrs.currentX !== undefined && attrs.currentY !== undefined) {
    state.color = matterXyToDeviceXy(attrs.currentX, attrs.currentY);
  }

  if (attrs.colorTemperatureMireds !== undefined) {
    state.colorTemperature = attrs.colorTemperatureMireds;
  }

  return state;
}
