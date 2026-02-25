import type {
  UnitCapabilities,
  UnitConfigPayload,
  UnitModule,
  UnitModuleContext,
} from '@/lib/units/types'

const DEFAULT_MVR5_CAPABILITIES: UnitCapabilities = {
  protocol: 'mvr5',
  unitModel: 'MVR5',
  cameraOptions: [
    { value: 0, label: 'Road Camera' },
    { value: 1, label: 'Driver Camera' },
  ],
  profileOptions: [
    { value: 0, label: 'High Resolution (1080p/720p)' },
    { value: 1, label: 'Low Resolution (360p)' },
  ],
  editableSections: [
    'general',
    'network',
    'cameras',
    'face_recognition',
    'eventpreviews',
    'description',
    'events',
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
      ...DEFAULT_MVR5_CAPABILITIES,
      unitModel: ctx.deviceModel || DEFAULT_MVR5_CAPABILITIES.unitModel,
    },
    rawCapabilities
  )
  const configPayload = (payload?.config && typeof payload.config === 'object') ? payload.config : payload

  return {
    config: (configPayload && typeof configPayload === 'object') ? configPayload : {},
    capabilities,
  }
}

export const mvr5Module: UnitModule = {
  protocol: 'mvr5',
  displayName: 'MVR5',
  getCapabilities: (ctx) => ({
    ...DEFAULT_MVR5_CAPABILITIES,
    unitModel: ctx.deviceModel || DEFAULT_MVR5_CAPABILITIES.unitModel,
  }),
  normalizeConfigResponse,
  getSectionOrder: (config, capabilities) => {
    const defaultOrder = [
      'general',
      'network',
      'cameras',
      'face_recognition',
      'eventpreviews',
      'description',
      'events',
    ]
    const fromConfig = Object.keys(config || {})
    const known = defaultOrder.filter((key) => fromConfig.includes(key))
    const extras = fromConfig.filter((key) => !known.includes(key))
    const fromCapabilities = (capabilities.editableSections || []).filter(
      (key) => !known.includes(key) && !extras.includes(key)
    )
    return [...known, ...extras, ...fromCapabilities]
  },
  validateUpdates: (updates, capabilities) => {
    const editableSections = capabilities?.editableSections || DEFAULT_MVR5_CAPABILITIES.editableSections || []
    if (editableSections.length === 0) return { ok: true }
    const editable = new Set(editableSections)
    const invalidSections = Object.keys(updates).filter((section) => !editable.has(section))
    if (invalidSections.length > 0) {
      return { ok: false, error: `read-only sections cannot be updated: ${invalidSections.join(', ')}` }
    }
    return { ok: true }
  },
}
