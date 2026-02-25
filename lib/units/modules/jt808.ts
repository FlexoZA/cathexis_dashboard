import type {
  UnitCapabilities,
  UnitConfigPayload,
  UnitModule,
  UnitModuleContext,
} from '@/lib/units/types'

const DEFAULT_JT808_CAPABILITIES: UnitCapabilities = {
  protocol: 'jt808',
  unitModel: 'N62',
  cameraOptions: [
    { value: 0, label: 'Channel 0' },
    { value: 1, label: 'Channel 1' },
    { value: 2, label: 'Channel 2' },
    { value: 3, label: 'Channel 3' },
  ],
  profileOptions: [
    { value: 0, label: 'Main Stream' },
    { value: 1, label: 'Sub Stream' },
  ],
  editableSections: [
    'GenDevInfo',
    'GenDateTime',
    'GenDst',
    'GenStartUp',
    'GenUser',
    'VehBaseInfo',
    'VehPosition',
    'VehMileage',
    'RecAttr',
    'RecStream_M',
    'RecStream_S',
    'ReCamAttr',
    'ReCapAttr',
    'AlmIoIn',
    'AlmSpd',
    'AlmGsn',
    'Driving',
    'NetWired',
    'NetWifi',
    'NetXg',
    'NetCms',
    'NetFtp',
    'PerUart',
    'PerIoOutput',
  ],
}

function mergeCapabilities(
  base: UnitCapabilities,
  incoming?: Partial<UnitCapabilities> | null
): UnitCapabilities {
  if (!incoming || typeof incoming !== 'object') return base
  return {
    ...base,
    ...incoming,
    cameraOptions: Array.isArray(incoming.cameraOptions) && incoming.cameraOptions.length > 0
      ? incoming.cameraOptions
      : base.cameraOptions,
    profileOptions: Array.isArray(incoming.profileOptions) && incoming.profileOptions.length > 0
      ? incoming.profileOptions
      : base.profileOptions,
    editableSections: Array.isArray(incoming.editableSections) && incoming.editableSections.length > 0
      ? incoming.editableSections
      : base.editableSections,
  }
}

function normalizeConfigResponse(payload: any, ctx: UnitModuleContext): UnitConfigPayload {
  const rawCapabilities = payload?.capabilities as Partial<UnitCapabilities> | undefined
  const capabilities = mergeCapabilities(
    {
      ...DEFAULT_JT808_CAPABILITIES,
      unitModel: ctx.deviceModel || DEFAULT_JT808_CAPABILITIES.unitModel,
    },
    rawCapabilities
  )
  const configPayload = (payload?.config && typeof payload.config === 'object') ? payload.config : payload

  return {
    config: (configPayload && typeof configPayload === 'object') ? configPayload : {},
    capabilities,
  }
}

export const jt808Module: UnitModule = {
  protocol: 'jt808',
  displayName: 'JT808 / N62',
  getCapabilities: (ctx) => ({
    ...DEFAULT_JT808_CAPABILITIES,
    unitModel: ctx.deviceModel || DEFAULT_JT808_CAPABILITIES.unitModel,
  }),
  normalizeConfigResponse,
  getSectionOrder: (config, capabilities) => {
    const fromConfig = Object.keys(config || {})
    const fromCapabilities = capabilities.editableSections || []
    const known = fromCapabilities.filter((key) => fromConfig.includes(key))
    const extras = fromConfig.filter((key) => !known.includes(key))
    const missingKnown = fromCapabilities.filter((key) => !known.includes(key) && !extras.includes(key))
    return [...known, ...extras, ...missingKnown]
  },
  validateUpdates: (updates, capabilities) => {
    const editableSections = capabilities?.editableSections || DEFAULT_JT808_CAPABILITIES.editableSections || []
    if (editableSections.length === 0) return { ok: true }
    const editable = new Set(editableSections)
    const invalidSections = Object.keys(updates).filter((section) => !editable.has(section))
    if (invalidSections.length > 0) {
      return { ok: false, error: `read-only sections cannot be updated: ${invalidSections.join(', ')}` }
    }
    return { ok: true }
  },
}
