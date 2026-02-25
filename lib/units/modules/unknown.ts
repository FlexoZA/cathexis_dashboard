import type {
  UnitCapabilities,
  UnitConfigPayload,
  UnitModule,
  UnitModuleContext,
} from '@/lib/units/types'

const UNKNOWN_CAPABILITIES: UnitCapabilities = {
  protocol: 'unknown',
  unitModel: 'Unknown',
  cameraOptions: [
    { value: 0, label: 'Camera 0' },
    { value: 1, label: 'Camera 1' },
  ],
  profileOptions: [
    { value: 0, label: 'Profile 0' },
    { value: 1, label: 'Profile 1' },
  ],
  editableSections: [],
}

function normalizeConfigResponse(payload: any, ctx: UnitModuleContext): UnitConfigPayload {
  const configPayload = (payload?.config && typeof payload.config === 'object') ? payload.config : payload
  const incomingCapabilities = payload?.capabilities as Partial<UnitCapabilities> | undefined

  return {
    config: (configPayload && typeof configPayload === 'object') ? configPayload : {},
    capabilities: {
      ...UNKNOWN_CAPABILITIES,
      ...incomingCapabilities,
      protocol: 'unknown',
      unitModel: ctx.deviceModel || incomingCapabilities?.unitModel || UNKNOWN_CAPABILITIES.unitModel,
      cameraOptions:
        Array.isArray(incomingCapabilities?.cameraOptions) && incomingCapabilities.cameraOptions.length > 0
          ? incomingCapabilities.cameraOptions
          : UNKNOWN_CAPABILITIES.cameraOptions,
      profileOptions:
        Array.isArray(incomingCapabilities?.profileOptions) && incomingCapabilities.profileOptions.length > 0
          ? incomingCapabilities.profileOptions
          : UNKNOWN_CAPABILITIES.profileOptions,
      editableSections:
        Array.isArray(incomingCapabilities?.editableSections)
          ? incomingCapabilities.editableSections
          : UNKNOWN_CAPABILITIES.editableSections,
    },
  }
}

export const unknownModule: UnitModule = {
  protocol: 'unknown',
  displayName: 'Unknown unit',
  getCapabilities: (ctx) => ({
    ...UNKNOWN_CAPABILITIES,
    unitModel: ctx.deviceModel || UNKNOWN_CAPABILITIES.unitModel,
  }),
  normalizeConfigResponse,
  getSectionOrder: (config) => Object.keys(config || {}),
  validateUpdates: () => ({ ok: false, error: 'Unknown protocol is read-only. Updates are not allowed.' }),
}
