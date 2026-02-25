import {
  getCapabilitiesForUnit,
  normalizeConfigForUnit,
  normalizeProtocol,
  resolveUnitModule,
} from '@/lib/units/registry'
import type { UnitCapabilities as ProtocolUnitCapabilities, UnitConfigPayload, UnitProtocol } from '@/lib/units/types'

export type UnitType = UnitProtocol
export type UnitProfileOption = ProtocolUnitCapabilities['profileOptions'][number]
export type UnitCameraOption = ProtocolUnitCapabilities['cameraOptions'][number]
export type UnitCapabilities = ProtocolUnitCapabilities & { unitType: UnitProtocol }
export interface NormalizedDeviceConfig extends UnitConfigPayload {
  capabilities: UnitCapabilities
}

export function detectUnitType(serial?: string | null, deviceModel?: string | null): UnitType {
  return resolveUnitModule({ serial, deviceModel }).protocol
}

export function inferCapabilities(
  serial?: string | null,
  deviceModel?: string | null,
  protocol?: string | null
): UnitCapabilities {
  const capabilities = getCapabilitiesForUnit({ serial, deviceModel, protocol })
  return {
    ...capabilities,
    unitType: capabilities.protocol,
  }
}

export function normalizeConfigResponse(
  payload: any,
  serial?: string | null,
  deviceModel?: string | null,
  protocol?: string | null
): NormalizedDeviceConfig {
  const normalized = normalizeConfigForUnit(payload, { serial, deviceModel, protocol })
  return {
    ...normalized,
    capabilities: {
      ...normalized.capabilities,
      unitType: normalized.capabilities.protocol,
    },
  }
}

export { normalizeProtocol }
