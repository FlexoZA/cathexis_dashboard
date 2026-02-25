export type UnitProtocol = 'mvr5' | 'jt808' | 'unknown'

export interface UnitProfileOption {
  value: number
  label: string
}

export interface UnitCameraOption {
  value: number
  label: string
}

export interface UnitCapabilities {
  protocol: UnitProtocol
  unitModel: string
  cameraOptions: UnitCameraOption[]
  profileOptions: UnitProfileOption[]
  editableSections?: string[]
}

export interface UnitModuleContext {
  serial?: string | null
  deviceModel?: string | null
  protocol?: string | null
}

export interface UnitConfigPayload {
  config: Record<string, any>
  capabilities: UnitCapabilities
}

export interface UnitModule {
  protocol: UnitProtocol
  displayName: string
  getCapabilities: (ctx: UnitModuleContext) => UnitCapabilities
  normalizeConfigResponse: (payload: any, ctx: UnitModuleContext) => UnitConfigPayload
  getSectionOrder: (config: Record<string, any>, capabilities: UnitCapabilities) => string[]
  validateUpdates: (
    updates: Record<string, any>,
    capabilities?: UnitCapabilities | null
  ) => { ok: true } | { ok: false; error: string }
}
