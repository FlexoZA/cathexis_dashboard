import type {
  UnitCapabilities,
  UnitConfigPayload,
  UnitModule,
  UnitModuleContext,
} from '@/lib/units/types'

const DEFAULT_HOWEN_CAPABILITIES: UnitCapabilities = {
  protocol: 'howen',
  unitModel: 'Howen Hero-MC30-02',
  cameraOptions: [
    { value: 0, label: 'Channel 0' },
    { value: 1, label: 'Channel 1' },
  ],
  profileOptions: [
    { value: 0, label: 'Main Stream' },
    { value: 1, label: 'Sub Stream' },
  ],
  editableSections: [],
}

function mergeCapabilities(
  base: UnitCapabilities,
  incoming?: Partial<UnitCapabilities> | null
): UnitCapabilities {
  if (!incoming || typeof incoming !== 'object') return base
  return {
    ...base,
    ...incoming,
    protocol: 'howen',
    cameraOptions: Array.isArray(incoming.cameraOptions) && incoming.cameraOptions.length > 0
      ? incoming.cameraOptions
      : base.cameraOptions,
    profileOptions: Array.isArray(incoming.profileOptions) && incoming.profileOptions.length > 0
      ? incoming.profileOptions
      : base.profileOptions,
    editableSections: Array.isArray(incoming.editableSections)
      ? incoming.editableSections
      : base.editableSections,
  }
}

function normalizeConfigResponse(payload: any, ctx: UnitModuleContext): UnitConfigPayload {
  const rawCapabilities = payload?.capabilities as Partial<UnitCapabilities> | undefined
  const capabilities = mergeCapabilities(
    {
      ...DEFAULT_HOWEN_CAPABILITIES,
      unitModel: ctx.deviceModel || DEFAULT_HOWEN_CAPABILITIES.unitModel,
    },
    rawCapabilities
  )
  const configPayload = (payload?.config && typeof payload.config === 'object') ? payload.config : payload

  return {
    config: (configPayload && typeof configPayload === 'object') ? configPayload : {},
    capabilities,
  }
}

export const howenModule: UnitModule = {
  protocol: 'howen',
  displayName: 'Howen Hero-MC30-02',
  getCapabilities: (ctx) => ({
    ...DEFAULT_HOWEN_CAPABILITIES,
    unitModel: ctx.deviceModel || DEFAULT_HOWEN_CAPABILITIES.unitModel,
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
    const editableSections = capabilities?.editableSections || DEFAULT_HOWEN_CAPABILITIES.editableSections || []
    if (editableSections.length === 0) return { ok: true }
    const editable = new Set(editableSections)
    const invalidSections = Object.keys(updates).filter((section) => !editable.has(section))
    if (invalidSections.length > 0) {
      return { ok: false, error: `read-only sections cannot be updated: ${invalidSections.join(', ')}` }
    }
    return { ok: true }
  },
}
