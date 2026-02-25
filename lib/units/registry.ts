import { jt808Module } from '@/lib/units/modules/jt808'
import { mvr5Module } from '@/lib/units/modules/mvr5'
import { unknownModule } from '@/lib/units/modules/unknown'
import type { UnitCapabilities, UnitConfigPayload, UnitModule, UnitModuleContext, UnitProtocol } from '@/lib/units/types'

const modules: Record<UnitProtocol, UnitModule> = {
  mvr5: mvr5Module,
  jt808: jt808Module,
  unknown: unknownModule,
}

function inferProtocolFromIdentifiers(serial?: string | null, deviceModel?: string | null): UnitProtocol {
  const serialUpper = (serial || '').toUpperCase()
  const modelUpper = (deviceModel || '').toUpperCase()

  if (serialUpper.startsWith('JT808_') || modelUpper.includes('N62') || modelUpper.includes('JT808')) {
    return 'jt808'
  }
  if (serialUpper.startsWith('MVR') || modelUpper.includes('MVR')) {
    return 'mvr5'
  }
  return 'unknown'
}

export function normalizeProtocol(protocol?: string | null): UnitProtocol {
  const normalized = (protocol || '').trim().toLowerCase()
  if (normalized === 'mvr5') return 'mvr5'
  if (normalized === 'jt808') return 'jt808'
  return 'unknown'
}

export function resolveUnitModule(ctx: UnitModuleContext): UnitModule {
  const protocol = normalizeProtocol(ctx.protocol)
  if (protocol !== 'unknown') return modules[protocol]

  const inferred = inferProtocolFromIdentifiers(ctx.serial, ctx.deviceModel)
  return modules[inferred]
}

export function getCapabilitiesForUnit(ctx: UnitModuleContext): UnitCapabilities {
  const module = resolveUnitModule(ctx)
  return module.getCapabilities(ctx)
}

export function normalizeConfigForUnit(payload: any, ctx: UnitModuleContext): UnitConfigPayload {
  const module = resolveUnitModule(ctx)
  return module.normalizeConfigResponse(payload, ctx)
}

export function getSectionOrderForUnit(
  config: Record<string, any>,
  capabilities: UnitCapabilities,
  ctx: UnitModuleContext
): string[] {
  const module = resolveUnitModule(ctx)
  return module.getSectionOrder(config, capabilities)
}

export function validateUnitUpdates(
  updates: Record<string, any>,
  capabilities: UnitCapabilities | null | undefined,
  ctx: UnitModuleContext
): { ok: true } | { ok: false; error: string } {
  const module = resolveUnitModule(ctx)
  return module.validateUpdates(updates, capabilities)
}
