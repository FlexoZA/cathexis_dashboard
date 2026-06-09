"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Eye, EyeOff, Loader2, RefreshCw, RotateCcw, Save, ShieldAlert } from "lucide-react"
import { useNotifications } from "@/components/notifications-provider"
import {
  ENABLE_KEYS,
  humanizeHowenLabel,
  inferHowenControl,
  isBooleanishValue,
  isHowenOn,
} from "@/lib/devices/howen/field-meta"

// Howen parameter configuration editor (0x40A0 GET/SET). See docs/HOWEN_API.md §3 / §4.2.
//
// The device returns every value as a string and field semantics (enums/ranges) are not yet
// decoded (§4.2.6), so this is a generic recursive editor: it GETs a segment, renders each leaf
// as a string input, and on SET sends ONLY the fields that changed (§3 quirk #4 — never
// read-modify-write the whole segment, or firmware garbage gets written back).

interface HowenDeviceConfigProps {
  serial: string
}

type Segment = Record<string, any>
type ConfigMap = Record<string, Segment>

interface GroupDef {
  key: string
  label: string
  description: string
  segments: string[]
  advanced?: boolean
  readOnly?: boolean
}

// Grouping mirrors the suggested screen model in docs/HOWEN_API.md §4.2.5.
const GROUPS: GroupDef[] = [
  {
    key: "general",
    label: "General",
    description: "Clock, daylight saving, language, power/ignition behaviour and on-screen display.",
    segments: ["CLOCK", "DST", "LANGUAGE", "POWER", "DISPLAY", "OSD"],
  },
  {
    key: "recording",
    label: "Recording",
    description: "Encoders & channels, privacy masks, PTZ and motion detection (per-channel objects).",
    segments: ["RECORD", "MASK", "Privacy", "PTZ", "MOTIONDETECT"],
  },
  {
    key: "alarms",
    label: "Alarms",
    description: "Speed, G-sensor, ADAS/DMS, voltage, temperature, roaming and IO alarm rules.",
    segments: ["SPEED", "GSENSOR", "ACC", "VOLTAGE", "TEMP", "ADAS", "DMS", "ROAMING", "IOSET", "PEOPLECOUNT"],
  },
  {
    key: "advanced",
    label: "Advanced",
    description: "Connectivity, identity and OTA. Changing these can disconnect, re-home or misconfigure the unit.",
    segments: ["SERVER", "JTBASE", "WIFI", "DIALUP", "UPGRADE"],
    advanced: true,
  },
  {
    key: "firmware",
    label: "Firmware",
    description: "Firmware, hardware and modem versions (read-only).",
    segments: ["VERSIONINFO"],
    readOnly: true,
  },
]

const PASSWORD_FIELD = /(pwd|passwd|password)$/i

// ─── Segment-map helpers ────────────────────────────────────────────────────────

/** Find the device's actual key for a segment — the device normalises casing (§3 quirk #2). */
function findKey(map: ConfigMap, name: string): string | null {
  const lower = name.toLowerCase()
  for (const key of Object.keys(map)) {
    if (key.toLowerCase() === lower) return key
  }
  return null
}

/** Merge fetched segments, replacing any prior key that matches case-insensitively. */
function mergeSegments(prev: ConfigMap, incoming: ConfigMap): ConfigMap {
  const next = { ...prev }
  for (const incomingKey of Object.keys(incoming)) {
    const existing = findKey(next, incomingKey)
    if (existing && existing !== incomingKey) delete next[existing]
    next[incomingKey] = incoming[incomingKey]
  }
  return next
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null))
}

/**
 * Minimal nested diff between an edited segment and its loaded baseline — preserves the object
 * shape but keeps only changed leaves, so SET sends only what changed (§3 quirk #4).
 */
function minimalDiff(current: any, initial: any): any {
  if (current === initial) return undefined
  if (current === null || typeof current !== "object") {
    return String(current) === String(initial) ? undefined : current
  }
  if (Array.isArray(current)) {
    return JSON.stringify(current) === JSON.stringify(initial) ? undefined : current
  }
  const result: Record<string, any> = {}
  for (const key of Object.keys(current)) {
    const diff = minimalDiff(current[key], initial?.[key])
    if (diff !== undefined) result[key] = diff
  }
  return Object.keys(result).length > 0 ? result : undefined
}

// ─── API helpers ────────────────────────────────────────────────────────────────

async function fetchHowenConfig(
  serial: string,
  modules: string[]
): Promise<{ sc: ConfigMap; error: string | null }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    const res = await fetch(`/api/units/${encodeURIComponent(serial)}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "request_config", payload: { modules } }),
      cache: "no-store",
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    const json = await res.json().catch(() => null)
    if (!res.ok || json?.ok === false) {
      return { sc: {}, error: json?.error || `Request failed (${res.status})` }
    }
    const sc = json?.data?.sc && typeof json.data.sc === "object" ? (json.data.sc as ConfigMap) : {}
    return { sc, error: null }
  } catch (err: any) {
    return { sc: {}, error: err?.name === "AbortError" ? "Request timed out" : err?.message ?? "Request failed" }
  }
}

async function updateHowenConfig(
  serial: string,
  sc: ConfigMap
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    const res = await fetch(`/api/units/${encodeURIComponent(serial)}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "update_config", payload: { sc } }),
      cache: "no-store",
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    const json = await res.json().catch(() => null)
    if (!res.ok || json?.ok === false) {
      return { ok: false, error: json?.error || `Update failed (${res.status})` }
    }
    return { ok: true, error: null }
  } catch (err: any) {
    return { ok: false, error: err?.name === "AbortError" ? "Update timed out" : err?.message ?? "Update failed" }
  }
}

// ─── Friendly field editors ─────────────────────────────────────────────────────

type Entry = [string, any]

/** Split an object node into its enable toggle (if any), leaf fields, and nested objects. */
function splitObject(value: Record<string, any>): {
  enableEntry: Entry | null
  leaves: Entry[]
  objects: Entry[]
} {
  const entries = Object.entries(value)
  const enableEntry = entries.find(([k, v]) => ENABLE_KEYS.has(k.toLowerCase()) && isBooleanishValue(v)) ?? null
  const rest = entries.filter((e) => e !== enableEntry)
  const leaves = rest.filter(([, v]) => v === null || typeof v !== "object" || Array.isArray(v))
  const objects = rest.filter(([, v]) => v !== null && typeof v === "object" && !Array.isArray(v))
  return { enableEntry, leaves, objects }
}

/** A single leaf value: a toggle for clear on/off fields, otherwise a labelled text input. */
function LeafField({
  name,
  value,
  disabled,
  onChange,
}: {
  name: string
  value: any
  disabled: boolean
  onChange: (next: any) => void
}) {
  const [revealed, setRevealed] = useState(false)
  const label = humanizeHowenLabel(name)

  // Arrays are uncommon in 0x40A0 payloads; fall back to a JSON text field.
  if (Array.isArray(value)) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-600">{label}</Label>
        <Input
          value={JSON.stringify(value)}
          disabled={disabled}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value))
            } catch {
              /* keep last valid value until JSON parses */
            }
          }}
        />
      </div>
    )
  }

  if (inferHowenControl(name, value) === "toggle") {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2">
        <Label className="text-sm text-gray-700">{label}</Label>
        <Switch checked={isHowenOn(value)} disabled={disabled} onCheckedChange={(c) => onChange(c ? "1" : "0")} />
      </div>
    )
  }

  const isPassword = PASSWORD_FIELD.test(name)
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      <div className="relative">
        <Input
          type={isPassword && !revealed ? "password" : "text"}
          className={isPassword ? "pr-10" : undefined}
          value={value === null || value === undefined ? "" : String(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        {isPassword && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => setRevealed((v) => !v)}
          >
            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}

/** A nested object rendered as a titled card with its enable toggle hoisted into the header. */
function ObjectGroup({
  name,
  value,
  disabled,
  onChange,
}: {
  name: string
  value: Record<string, any>
  disabled: boolean
  onChange: (next: any) => void
}) {
  const { enableEntry, leaves, objects } = splitObject(value)
  const setChild = (key: string, next: any) => onChange({ ...value, [key]: next })

  return (
    <div className="rounded-lg border border-gray-200">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="text-sm font-semibold text-gray-900">{humanizeHowenLabel(name)}</div>
        {enableEntry && (
          <Switch
            checked={isHowenOn(enableEntry[1])}
            disabled={disabled}
            onCheckedChange={(c) => setChild(enableEntry[0], c ? "1" : "0")}
          />
        )}
      </div>
      <div className="p-4 space-y-4">
        {leaves.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            {leaves.map(([k, v]) => (
              <LeafField key={k} name={k} value={v} disabled={disabled} onChange={(next) => setChild(k, next)} />
            ))}
          </div>
        )}
        {objects.map(([k, v]) => (
          <ObjectGroup key={k} name={k} value={v} disabled={disabled} onChange={(next) => setChild(k, next)} />
        ))}
      </div>
    </div>
  )
}

/** Renders a segment's contents inside its card: leaf grid first, then nested object cards. */
function SegmentBody({
  value,
  disabled,
  onChange,
}: {
  value: Record<string, any>
  disabled: boolean
  onChange: (next: any) => void
}) {
  if (!value || typeof value !== "object" || Object.keys(value).length === 0) {
    return <p className="text-sm text-gray-500">No fields returned for this segment.</p>
  }

  const { enableEntry, leaves, objects } = splitObject(value)
  const setChild = (key: string, next: any) => onChange({ ...value, [key]: next })
  const leafEntries = enableEntry ? [enableEntry, ...leaves] : leaves

  return (
    <div className="space-y-4">
      {leafEntries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {leafEntries.map(([k, v]) => (
            <LeafField key={k} name={k} value={v} disabled={disabled} onChange={(next) => setChild(k, next)} />
          ))}
        </div>
      )}
      {objects.map(([k, v]) => (
        <ObjectGroup key={k} name={k} value={v} disabled={disabled} onChange={(next) => setChild(k, next)} />
      ))}
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function HowenDeviceConfig({ serial }: HowenDeviceConfigProps) {
  const { addNotification } = useNotifications()
  const [activeGroup, setActiveGroup] = useState<string>(GROUPS[0].key)
  const [loaded, setLoaded] = useState<ConfigMap>({})
  const [draft, setDraft] = useState<ConfigMap>({})
  const [groupState, setGroupState] = useState<Record<string, { loading: boolean; error: string | null; loadedAt: string | null }>>({})
  const [savingSegment, setSavingSegment] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ group: GroupDef; segment: string; deviceKey: string } | null>(null)

  const group = useMemo(() => GROUPS.find((g) => g.key === activeGroup) ?? GROUPS[0], [activeGroup])

  const loadGroup = useCallback(
    async (target: GroupDef) => {
      setGroupState((prev) => ({ ...prev, [target.key]: { loading: true, error: null, loadedAt: prev[target.key]?.loadedAt ?? null } }))
      const { sc, error } = await fetchHowenConfig(serial, target.segments)
      setLoaded((prev) => mergeSegments(prev, sc))
      setDraft((prev) => mergeSegments(prev, clone(sc)))
      setGroupState((prev) => ({
        ...prev,
        [target.key]: { loading: false, error, loadedAt: new Date().toISOString() },
      }))
    },
    [serial]
  )

  // Lazy-load each group the first time it becomes active.
  useEffect(() => {
    if (!serial) return
    const state = groupState[group.key]
    if (state?.loading || state?.loadedAt) return
    console.log("DEBUG::HowenDeviceConfig", { action: "load group", serial, group: group.key })
    void loadGroup(group)
  }, [serial, group, groupState, loadGroup])

  function setSegmentDraft(deviceKey: string, next: Segment) {
    setDraft((prev) => ({ ...prev, [deviceKey]: next }))
  }

  function revertSegment(deviceKey: string) {
    setDraft((prev) => ({ ...prev, [deviceKey]: clone(loaded[deviceKey]) }))
  }

  async function saveSegment(segment: string, deviceKey: string) {
    const diff = minimalDiff(draft[deviceKey], loaded[deviceKey])
    if (diff === undefined) return

    setSavingSegment(deviceKey)
    setConfirm(null)
    console.log("DEBUG::HowenDeviceConfig", { action: "update_config", serial, segment: deviceKey, fields: Object.keys(diff) })

    const { ok, error } = await updateHowenConfig(serial, { [deviceKey]: diff })

    if (!ok) {
      setGroupState((prev) => ({ ...prev, [group.key]: { ...(prev[group.key] ?? { loadedAt: null }), loading: false, error: error || "Update failed" } }))
      addNotification("Config update failed", `${segment}: ${error ?? "unknown error"}`)
      setSavingSegment(null)
      return
    }

    // Verify with a follow-up GET (recommended in §4.2.4 / §11) and clear the diff.
    const refetched = await fetchHowenConfig(serial, [deviceKey])
    if (Object.keys(refetched.sc).length > 0) {
      setLoaded((prev) => mergeSegments(prev, refetched.sc))
      setDraft((prev) => mergeSegments(prev, clone(refetched.sc)))
    } else {
      // Device didn't echo the segment back; accept the draft as the new baseline.
      setLoaded((prev) => ({ ...prev, [deviceKey]: clone(draft[deviceKey]) }))
    }

    addNotification("Config updated", `${segment} saved to ${serial}.`)
    setSavingSegment(null)
  }

  function onSaveClick(segment: string, deviceKey: string) {
    if (group.advanced) {
      setConfirm({ group, segment, deviceKey })
      return
    }
    void saveSegment(segment, deviceKey)
  }

  const state = groupState[group.key]

  return (
    <div className="space-y-5">
      {/* Group tabs */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <Button
            key={g.key}
            variant={activeGroup === g.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveGroup(g.key)}
            className="flex items-center gap-2"
          >
            <span>{g.label}</span>
            {g.advanced && <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />}
            {g.readOnly && <span className="text-xs text-gray-500">read-only</span>}
          </Button>
        ))}
      </div>

      {/* Group header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{group.label}</h2>
          <p className="text-sm text-gray-600 max-w-2xl">{group.description}</p>
          {state?.loadedAt && (
            <p className="text-xs text-gray-400 mt-1">Loaded: {new Date(state.loadedAt).toLocaleString()}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadGroup(group)} disabled={state?.loading} className="flex items-center gap-2">
          {state?.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      {group.advanced && (
        <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            These segments control connectivity and identity. A bad value can take the unit offline or re-home it to a
            different server. Saving requires confirmation.
          </span>
        </div>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      {/* Segment cards */}
      <div className="space-y-5">
        {group.segments.map((segment) => {
          const deviceKey = findKey(draft, segment)
          const loadedKey = deviceKey ? findKey(loaded, segment) : null

          if (state?.loading && !deviceKey) {
            return (
              <div key={segment} className="bg-white border border-gray-200 rounded-lg p-5 flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading {segment}…</span>
              </div>
            )
          }

          if (!deviceKey || !loadedKey) {
            if (state?.loading || !state?.loadedAt) return null
            return (
              <div key={segment} className="bg-white border border-gray-200 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-gray-900">{segment}</h3>
                <p className="text-sm text-gray-500 mt-1">Not reported by this device — likely unsupported on this firmware.</p>
              </div>
            )
          }

          const segmentValue = draft[deviceKey]
          const changed = minimalDiff(segmentValue, loaded[loadedKey]) !== undefined
          const saving = savingSegment === deviceKey
          const readOnly = Boolean(group.readOnly)

          return (
            <div key={segment} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{deviceKey}</h3>
                  {changed && <span className="text-xs text-orange-700">● unsaved</span>}
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => revertSegment(deviceKey)} disabled={!changed || saving}>
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Revert
                    </Button>
                    <Button size="sm" onClick={() => onSaveClick(deviceKey, deviceKey)} disabled={!changed || saving}>
                      {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                      Save {deviceKey}
                    </Button>
                  </div>
                )}
              </div>

              <SegmentBody
                value={segmentValue}
                disabled={readOnly || saving}
                onChange={(next) => setSegmentDraft(deviceKey, next)}
              />
            </div>
          )
        })}
      </div>

      {/* Advanced-save confirmation */}
      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply changes to {confirm?.segment}?</AlertDialogTitle>
            <AlertDialogDescription>
              This writes to an advanced segment on {serial}. Only the fields you changed are sent, but an incorrect
              value here can disconnect or re-home the unit. Verify the values before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm && (
            <div className="mt-2 rounded border bg-gray-50 p-3 text-xs font-mono text-gray-800 max-h-60 overflow-auto break-all">
              {JSON.stringify(minimalDiff(draft[confirm.deviceKey], loaded[confirm.deviceKey]) ?? {}, null, 2)}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingSegment !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (confirm) void saveSegment(confirm.segment, confirm.deviceKey)
              }}
              disabled={savingSegment !== null}
            >
              {savingSegment !== null ? "Saving…" : "Save changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
