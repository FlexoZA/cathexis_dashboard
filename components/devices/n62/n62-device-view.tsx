"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Cpu, Wifi, Signal, HardDrive, Car, Clock, Navigation,
  Server, RefreshCw, Loader2, Radio, Check, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Types ────────────────────────────────────────────────────────────────────

interface N62DeviceViewProps { serial: string }

interface DataState {
  data: any | null
  loading: boolean
  error: string | null
  loadedAt: string | null
}

interface SectionEditState {
  editing: boolean
  draft: Record<string, string>
  saving: boolean
  error: string | null
}

interface CmsServerDraft {
  Enable: string
  ServersAddr: string
  Protocol: string
  VisitType: string
}

interface BatchCommand {
  key: string
  type: string
  payload?: Record<string, unknown>
}

const INIT_STATE: DataState = { data: null, loading: false, error: null, loadedAt: null }
const EDIT_INIT: SectionEditState = { editing: false, draft: {}, saving: false, error: null }

// ─── API helpers ──────────────────────────────────────────────────────────────

async function postCommand(
  serial: string,
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<{ data: any; error: string | null }> {
  try {
    const res = await fetch(`/api/units/${encodeURIComponent(serial)}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal,
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) return { data: null, error: json?.error || `Request failed (${res.status})` }
    const raw = json?.data ?? null
    return { data: raw?.payload ?? raw, error: null }
  } catch (err: any) {
    return { data: null, error: err?.name === "AbortError" ? "Request timed out" : (err?.message ?? "Request failed") }
  }
}

async function fetchSdHealth(
  serial: string,
  signal?: AbortSignal
): Promise<{ data: any; error: string | null }> {
  try {
    const res = await fetch(`/api/units/${encodeURIComponent(serial)}/sd-health`, { cache: "no-store", signal })
    const json = await res.json().catch(() => null)
    if (!res.ok) return { data: null, error: json?.error || `SD health request failed (${res.status})` }
    return { data: json?.data ?? null, error: null }
  } catch (err: any) {
    return { data: null, error: err?.name === "AbortError" ? "Request timed out" : (err?.message ?? "Failed to fetch SD health") }
  }
}

async function fetchBatch(
  serial: string,
  commands: BatchCommand[],
  signal?: AbortSignal
): Promise<Record<string, { data: any; error: string | null }>> {
  try {
    const res = await fetch(`/api/units/${encodeURIComponent(serial)}/n62-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
      cache: "no-store",
      signal,
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.ok) {
      const err = json?.error ?? `Batch request failed (${res.status})`
      return Object.fromEntries(commands.map((c) => [c.key, { data: null, error: err }]))
    }
    const results: Record<string, { data: any; error: string | null }> = {}
    for (const cmd of commands) {
      const r = json.results?.[cmd.key]
      results[cmd.key] = r ? { data: r.data ?? null, error: r.error ?? null } : { data: null, error: "Missing in response" }
    }
    return results
  } catch (err: any) {
    const msg = err?.name === "AbortError" ? "Request timed out" : (err?.message ?? "Batch failed")
    return Object.fromEntries(commands.map((c) => [c.key, { data: null, error: msg }]))
  }
}

async function updateConfig(
  serial: string,
  paramType: string,
  params: Record<string, unknown>
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const res = await fetch(`/api/units/${encodeURIComponent(serial)}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "update_config", payload: { paramType, params: { ParamType: paramType, ...params } } }),
      cache: "no-store",
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || json?.ok === false) return { ok: false, error: json?.error ?? `Update failed (${res.status})` }
    const resultVal = json?.data?.payload?.Value ?? json?.data?.Value
    if (resultVal !== 0 && resultVal !== undefined) return { ok: false, error: `Unit returned error code ${resultVal}` }
    return { ok: true, error: null }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Update failed" }
  }
}

const N62_BATCH_COMMANDS: BatchCommand[] = [
  { key: "devInfo",  type: "request_config", payload: { paramType: "GenDevInfo" } },
  { key: "sysTime",  type: "request_config", payload: { paramType: "GenDateTime" } },
  { key: "vehBase",  type: "request_config", payload: { paramType: "VehBaseInfo" } },
  { key: "vehPos",   type: "request_config", payload: { paramType: "VehPosition" } },
  { key: "net4g",    type: "request_config", payload: { paramType: "NetXg" } },
  { key: "netWifi",  type: "request_config", payload: { paramType: "NetWifi" } },
  { key: "netCms",   type: "request_config", payload: { paramType: "NetCms" } },
  { key: "basicStatus", type: "basic_status" },
  { key: "recAttr",  type: "request_config", payload: { paramType: "RecAttr" } },
  { key: "sdHealth", type: "sd_health" },
  { key: "termAttr", type: "request_environment" },
]

// ─── State helpers ────────────────────────────────────────────────────────────

function settled(setter: React.Dispatch<React.SetStateAction<DataState>>, result: { data: any; error: string | null }) {
  setter({ data: result.data, loading: false, error: result.error, loadedAt: new Date().toISOString() })
}

function startLoading(setter: React.Dispatch<React.SetStateAction<DataState>>) {
  setter((prev) => ({ ...prev, loading: true, error: null }))
}

/** Safe integer parse — returns 0 for non-numeric input */
function int(v: string): number {
  const p = parseInt(v, 10)
  return isNaN(p) ? 0 : p
}

// ─── UI building blocks ───────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right break-all">
        {value !== undefined && value !== null && value !== "" ? value : "—"}
      </span>
    </div>
  )
}

function EditRow({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0 w-28">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? label} className="h-7 text-sm py-0" />
    </div>
  )
}

function SelectRow({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0 w-28">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function EditActions({ onSave, onCancel, saving, error }: {
  onSave: () => void; onCancel: () => void; saving: boolean; error: string | null
}) {
  return (
    <>
      {error && <p className="text-xs text-red-500 pt-1">{error}</p>}
      <div className="flex gap-2 pt-3">
        <Button size="sm" onClick={onSave} disabled={saving} className="flex items-center gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving} className="flex items-center gap-1.5">
          <X className="w-3.5 h-3.5" />
          Cancel
        </Button>
      </div>
    </>
  )
}


function SectionCard({ title, icon: Icon, state, onRefresh, headerAction, children }: {
  title: string
  icon: React.ElementType
  state: DataState
  onRefresh: () => void
  headerAction?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          {title}
        </h3>
        <div className="flex items-center gap-1">
          {headerAction}
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={state.loading} className="h-7 w-7 p-0">
            {state.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
      {state.loadedAt && (
        <p className="text-xs text-gray-400 mb-3">Loaded: {new Date(state.loadedAt).toLocaleString()}</p>
      )}
      {state.loading && !state.loadedAt ? (
        <div className="flex items-center gap-2 py-6 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : state.error && !state.data ? (
        <p className="text-sm text-red-500 py-2">{state.error}</p>
      ) : !state.data ? (
        <p className="text-sm text-gray-400 py-2">No data available</p>
      ) : (
        children
      )}
      {state.error && state.data && <p className="text-xs text-red-500 mt-2">{state.error}</p>}
    </div>
  )
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function enabledDisabled(val: unknown): string {
  if (val === 1 || val === true) return "Enabled"
  if (val === 0 || val === false) return "Disabled"
  return String(val ?? "—")
}

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

const ENABLED_OPTS = [{ value: "0", label: "Disabled" }, { value: "1", label: "Enabled" }]

// ─── Component ────────────────────────────────────────────────────────────────

export function N62DeviceView({ serial }: N62DeviceViewProps) {
  // ── data state ──
  const [devInfo,  setDevInfo]  = useState<DataState>({ ...INIT_STATE })
  const [sysTime,  setSysTime]  = useState<DataState>({ ...INIT_STATE })
  const [vehBase,  setVehBase]  = useState<DataState>({ ...INIT_STATE })
  const [vehPos,   setVehPos]   = useState<DataState>({ ...INIT_STATE })
  const [net4g,    setNet4g]    = useState<DataState>({ ...INIT_STATE })
  const [netWifi,  setNetWifi]  = useState<DataState>({ ...INIT_STATE })
  const [netCms,   setNetCms]   = useState<DataState>({ ...INIT_STATE })
  const [basicStatus, setBasicStatus] = useState<DataState>({ ...INIT_STATE })
  const [recAttr,  setRecAttr]  = useState<DataState>({ ...INIT_STATE })
  const [sdHealth, setSdHealth] = useState<DataState>({ ...INIT_STATE })
  const [termAttr, setTermAttr] = useState<DataState>({ ...INIT_STATE })

  // ── edit state ──
  const [vehBaseEdit, setVehBaseEdit] = useState<SectionEditState>({ ...EDIT_INIT })
  const [sysTimeEdit, setSysTimeEdit] = useState<SectionEditState>({ ...EDIT_INIT })
  const [net4gEdit,   setNet4gEdit]   = useState<SectionEditState>({ ...EDIT_INIT })
  const [netWifiEdit, setNetWifiEdit] = useState<SectionEditState>({ ...EDIT_INIT })
  const [netCmsEdit,  setNetCmsEdit]  = useState<{ editing: boolean; servers: CmsServerDraft[]; saving: boolean; error: string | null }>({ editing: false, servers: [], saving: false, error: null })
  const [vehPosEdit,  setVehPosEdit]  = useState<SectionEditState>({ ...EDIT_INIT })
  const [recAttrEdit, setRecAttrEdit] = useState<SectionEditState>({ ...EDIT_INIT })

  // ── refresh callbacks ──
  const refreshDevInfo  = useCallback(() => { startLoading(setDevInfo);  postCommand(serial, { type: "request_config", payload: { paramType: "GenDevInfo"  } }).then((r) => settled(setDevInfo,  r)) }, [serial])
  const refreshSysTime  = useCallback(() => { startLoading(setSysTime);  postCommand(serial, { type: "request_config", payload: { paramType: "GenDateTime" } }).then((r) => settled(setSysTime,  r)) }, [serial])
  const refreshVehBase  = useCallback(() => { startLoading(setVehBase);  postCommand(serial, { type: "request_config", payload: { paramType: "VehBaseInfo" } }).then((r) => settled(setVehBase,  r)) }, [serial])
  const refreshVehPos   = useCallback(() => { startLoading(setVehPos);   postCommand(serial, { type: "request_config", payload: { paramType: "VehPosition" } }).then((r) => settled(setVehPos,   r)) }, [serial])
  const refreshNet4g    = useCallback(() => { startLoading(setNet4g);    postCommand(serial, { type: "request_config", payload: { paramType: "NetXg"       } }).then((r) => settled(setNet4g,    r)) }, [serial])
  const refreshNetWifi  = useCallback(() => { startLoading(setNetWifi);  postCommand(serial, { type: "request_config", payload: { paramType: "NetWifi"     } }).then((r) => settled(setNetWifi,  r)) }, [serial])
  const refreshNetCms   = useCallback(() => { startLoading(setNetCms);   postCommand(serial, { type: "request_config", payload: { paramType: "NetCms"      } }).then((r) => settled(setNetCms,   r)) }, [serial])
  const refreshRecAttr  = useCallback(() => { startLoading(setRecAttr);  postCommand(serial, { type: "request_config", payload: { paramType: "RecAttr"     } }).then((r) => settled(setRecAttr,  r)) }, [serial])
  const refreshSdHealth = useCallback(() => { startLoading(setSdHealth); fetchSdHealth(serial).then((r) => settled(setSdHealth, r)) }, [serial])
  const refreshTermAttr = useCallback(() => { startLoading(setTermAttr); postCommand(serial, { type: "request_environment" }).then((r) => settled(setTermAttr, r)) }, [serial])

  // ── Vehicle & Driver ──
  const startEditVehBase = useCallback(() => {
    setVehBaseEdit({ editing: true, saving: false, error: null, draft: {
      CarPlate:     vehBase.data?.CarPlate     ?? "",
      Company:      vehBase.data?.Company      ?? "",
      DriverName:   vehBase.data?.DriverName   ?? "",
      DriverLic:    vehBase.data?.DriverLic    ?? "",
      PhoneNum:     vehBase.data?.PhoneNum     ?? "",
      AssemblyDate: vehBase.data?.AssemblyDate ?? "",
    }})
  }, [vehBase.data])

  const saveVehBase = useCallback(async () => {
    const { draft } = vehBaseEdit
    setVehBaseEdit((e) => ({ ...e, saving: true, error: null }))
    console.log("DEBUG::N62DeviceView", "Saving VehBaseInfo", { draft })
    const result = await updateConfig(serial, "VehBaseInfo", {
      CarPlate: draft.CarPlate, Company: draft.Company, DriverName: draft.DriverName,
      DriverLic: draft.DriverLic, PhoneNum: draft.PhoneNum, AssemblyDate: draft.AssemblyDate,
      ShortName: vehBase.data?.ShortName ?? 0,
    })
    if (!result.ok) { setVehBaseEdit((e) => ({ ...e, saving: false, error: result.error })); return }
    setVehBaseEdit({ ...EDIT_INIT })
    startLoading(setVehBase)
    postCommand(serial, { type: "request_config", payload: { paramType: "VehBaseInfo" } }).then((r) => settled(setVehBase, r))
  }, [serial, vehBaseEdit, vehBase.data?.ShortName])

  // ── System Time ──
  const startEditSysTime = useCallback(() => {
    setSysTimeEdit({ editing: true, saving: false, error: null, draft: {
      DateTime:   sysTime.data?.DateTime                  ?? "",
      Zone:       sysTime.data?.Zone                      ?? "",
      GpsSync:    String(sysTime.data?.GpsSync   ?? 0),
      NtpSync:    sysTime.data?.NtpSync                   ?? "",
      DateFormat: String(sysTime.data?.DateFormat ?? 0),
      TimeFormat: String(sysTime.data?.TimeFormat ?? 0),
    }})
  }, [sysTime.data])

  const saveSysTime = useCallback(async () => {
    const { draft } = sysTimeEdit
    setSysTimeEdit((e) => ({ ...e, saving: true, error: null }))
    console.log("DEBUG::N62DeviceView", "Saving GenDateTime", { draft })
    const result = await updateConfig(serial, "GenDateTime", {
      DateTime: draft.DateTime, Zone: draft.Zone,
      GpsSync: int(draft.GpsSync), NtpSync: draft.NtpSync,
      DateFormat: int(draft.DateFormat), TimeFormat: int(draft.TimeFormat),
    })
    if (!result.ok) { setSysTimeEdit((e) => ({ ...e, saving: false, error: result.error })); return }
    setSysTimeEdit({ ...EDIT_INIT })
    startLoading(setSysTime)
    postCommand(serial, { type: "request_config", payload: { paramType: "GenDateTime" } }).then((r) => settled(setSysTime, r))
  }, [serial, sysTimeEdit])

  // ── 4G Network ──
  const startEditNet4g = useCallback(() => {
    setNet4gEdit({ editing: true, saving: false, error: null, draft: {
      Enable:      String(net4g.data?.Enable      ?? 0),
      APN:         net4g.data?.APN?.trim()         ?? "",
      Mode:        String(net4g.data?.Mode         ?? 0),
      AuthType:    String(net4g.data?.AuthType     ?? 0),
      CenterNum:   net4g.data?.CenterNum            ?? "",
      RedialInter: String(net4g.data?.RedialInter  ?? 10),
      AbRestartEn: String(net4g.data?.AbRestartEn  ?? 0),
    }})
  }, [net4g.data])

  const saveNet4g = useCallback(async () => {
    const { draft } = net4gEdit
    setNet4gEdit((e) => ({ ...e, saving: true, error: null }))
    console.log("DEBUG::N62DeviceView", "Saving NetXg", { draft })
    const result = await updateConfig(serial, "NetXg", {
      Enable: int(draft.Enable), APN: draft.APN, Mode: int(draft.Mode),
      AuthType: int(draft.AuthType), CenterNum: draft.CenterNum,
      RedialInter: int(draft.RedialInter), AbRestartEn: int(draft.AbRestartEn),
      User: net4g.data?.User ?? "", Pwd: net4g.data?.Pwd ?? "",
    })
    if (!result.ok) { setNet4gEdit((e) => ({ ...e, saving: false, error: result.error })); return }
    setNet4gEdit({ ...EDIT_INIT })
    startLoading(setNet4g)
    postCommand(serial, { type: "request_config", payload: { paramType: "NetXg" } }).then((r) => settled(setNet4g, r))
  }, [serial, net4gEdit, net4g.data?.User, net4g.data?.Pwd])

  // ── WiFi ──
  const startEditNetWifi = useCallback(() => {
    setNetWifiEdit({ editing: true, saving: false, error: null, draft: {
      Enable:      String(netWifi.data?.Enable      ?? 0),
      SSID:        netWifi.data?.SSID                ?? "",
      Mode:        String(netWifi.data?.Mode         ?? 0),
      EncryptType: String(netWifi.data?.EncryptType  ?? 0),
      DhcpEn:      String(netWifi.data?.DhcpEn       ?? 0),
    }})
  }, [netWifi.data])

  const saveNetWifi = useCallback(async () => {
    const { draft } = netWifiEdit
    setNetWifiEdit((e) => ({ ...e, saving: true, error: null }))
    console.log("DEBUG::N62DeviceView", "Saving NetWifi", { draft })
    const result = await updateConfig(serial, "NetWifi", {
      Enable: int(draft.Enable), SSID: draft.SSID, Mode: int(draft.Mode),
      EncryptType: int(draft.EncryptType), DhcpEn: int(draft.DhcpEn),
      Pwd: netWifi.data?.Pwd ?? "",
    })
    if (!result.ok) { setNetWifiEdit((e) => ({ ...e, saving: false, error: result.error })); return }
    setNetWifiEdit({ ...EDIT_INIT })
    startLoading(setNetWifi)
    postCommand(serial, { type: "request_config", payload: { paramType: "NetWifi" } }).then((r) => settled(setNetWifi, r))
  }, [serial, netWifiEdit, netWifi.data?.Pwd])

  // ── CMS Servers ──
  const startEditNetCms = useCallback(() => {
    const count = netCms.data?.ChnNum ?? 0
    const servers: CmsServerDraft[] = Array.from({ length: count }, (_, i) => {
      const srv = netCms.data?.[`Server_${String(i).padStart(2, "0")}`] ?? {}
      return {
        Enable:      String(srv.Enable      ?? 0),
        ServersAddr: srv.ServersAddr          ?? "",
        Protocol:    String(srv.Protocol    ?? 0),
        VisitType:   String(srv.VisitType   ?? 0),
      }
    })
    setNetCmsEdit({ editing: true, servers, saving: false, error: null })
  }, [netCms.data])

  const saveNetCms = useCallback(async () => {
    setNetCmsEdit((e) => ({ ...e, saving: true, error: null }))
    const params: Record<string, unknown> = { ChnNum: netCms.data?.ChnNum ?? 0 }
    netCmsEdit.servers.forEach((srv, i) => {
      params[`Server_${String(i).padStart(2, "0")}`] = {
        Enable: int(srv.Enable), ServersAddr: srv.ServersAddr,
        Protocol: int(srv.Protocol), VisitType: int(srv.VisitType),
      }
    })
    console.log("DEBUG::N62DeviceView", "Saving NetCms", { params })
    const result = await updateConfig(serial, "NetCms", params)
    if (!result.ok) { setNetCmsEdit((e) => ({ ...e, saving: false, error: result.error })); return }
    setNetCmsEdit({ editing: false, servers: [], saving: false, error: null })
    startLoading(setNetCms)
    postCommand(serial, { type: "request_config", payload: { paramType: "NetCms" } }).then((r) => settled(setNetCms, r))
  }, [serial, netCmsEdit, netCms.data?.ChnNum])

  // ── GPS Settings ──
  const startEditVehPos = useCallback(() => {
    setVehPosEdit({ editing: true, saving: false, error: null, draft: {
      GpsMode:       String(vehPos.data?.GpsMode       ?? 3),
      GpsUpInterval: String(vehPos.data?.GpsUpInterval ?? 30),
      GpsBatchNum:   String(vehPos.data?.GpsBatchNum   ?? 1),
      SpdCorrV:      String(vehPos.data?.SpdCorrV      ?? 0),
      SpdFilter:     String(vehPos.data?.SpdFilter     ?? 0),
    }})
  }, [vehPos.data])

  const saveVehPos = useCallback(async () => {
    const { draft } = vehPosEdit
    setVehPosEdit((e) => ({ ...e, saving: true, error: null }))
    console.log("DEBUG::N62DeviceView", "Saving VehPosition", { draft })
    const result = await updateConfig(serial, "VehPosition", {
      GpsMode: int(draft.GpsMode), GpsUpInterval: int(draft.GpsUpInterval),
      GpsBatchNum: int(draft.GpsBatchNum), SpdCorrV: int(draft.SpdCorrV), SpdFilter: int(draft.SpdFilter),
    })
    if (!result.ok) { setVehPosEdit((e) => ({ ...e, saving: false, error: result.error })); return }
    setVehPosEdit({ ...EDIT_INIT })
    startLoading(setVehPos)
    postCommand(serial, { type: "request_config", payload: { paramType: "VehPosition" } }).then((r) => settled(setVehPos, r))
  }, [serial, vehPosEdit])

  // ── Recording ──
  const startEditRecAttr = useCallback(() => {
    setRecAttrEdit({ editing: true, saving: false, error: null, draft: {
      Mode:        String(recAttr.data?.Mode        ?? 0),
      Duration:    String(recAttr.data?.Duration    ?? 10),
      PreDuration: String(recAttr.data?.PreDuration ?? 5),
      SaveDays:    String(recAttr.data?.SaveDays    ?? 7),
      StreamType:  String(recAttr.data?.StreamType  ?? 0),
      FileFormat:  String(recAttr.data?.FileFormat  ?? 0),
    }})
  }, [recAttr.data])

  const saveRecAttr = useCallback(async () => {
    const { draft } = recAttrEdit
    setRecAttrEdit((e) => ({ ...e, saving: true, error: null }))
    console.log("DEBUG::N62DeviceView", "Saving RecAttr", { draft })
    const result = await updateConfig(serial, "RecAttr", {
      Mode: int(draft.Mode), Duration: int(draft.Duration), PreDuration: int(draft.PreDuration),
      SaveDays: int(draft.SaveDays), StreamType: int(draft.StreamType), FileFormat: int(draft.FileFormat),
      Encrypt: recAttr.data?.Encrypt ?? "0,0", VencFormat: recAttr.data?.VencFormat ?? 0,
    })
    if (!result.ok) { setRecAttrEdit((e) => ({ ...e, saving: false, error: result.error })); return }
    setRecAttrEdit({ ...EDIT_INIT })
    startLoading(setRecAttr)
    postCommand(serial, { type: "request_config", payload: { paramType: "RecAttr" } }).then((r) => settled(setRecAttr, r))
  }, [serial, recAttrEdit, recAttr.data?.Encrypt, recAttr.data?.VencFormat])

  // ── batch load / refresh all ──
  const runBatch = useCallback((sig?: AbortSignal) => {
    const setters = [setDevInfo, setSysTime, setVehBase, setVehPos, setNet4g, setNetWifi, setNetCms, setBasicStatus, setRecAttr, setSdHealth, setTermAttr]
    setters.forEach((s) => startLoading(s))
    fetchBatch(serial, N62_BATCH_COMMANDS, sig).then((results) => {
      // Signal aborted means the effect cleaned up (e.g. React StrictMode remount).
      // Ignore the result — the new effect will start a fresh batch.
      if (sig?.aborted) return
      settled(setDevInfo,  results.devInfo)
      settled(setSysTime,  results.sysTime)
      settled(setVehBase,  results.vehBase)
      settled(setVehPos,   results.vehPos)
      settled(setNet4g,    results.net4g)
      settled(setNetWifi,  results.netWifi)
      settled(setNetCms,   results.netCms)
      settled(setBasicStatus, results.basicStatus)
      settled(setRecAttr,  results.recAttr)
      settled(setSdHealth, results.sdHealth)
      settled(setTermAttr, results.termAttr)
    })
  }, [serial])

  const refreshAll = useCallback(() => {
    console.log("DEBUG::N62DeviceView", "Refresh all (batch) started", { serial })
    runBatch()
  }, [runBatch, serial])

  useEffect(() => {
    if (!serial) return
    console.log("DEBUG::N62DeviceView", "Auto-fetching all N62 data (batch)", { serial })
    const controller = new AbortController()
    runBatch(controller.signal)
    return () => controller.abort()
  }, [serial, runBatch])

  const allLoading = [devInfo, sysTime, vehBase, vehPos, net4g, netWifi, netCms, basicStatus, recAttr, sdHealth, termAttr].some((s) => s.loading)

  // ── helpers for CMS server draft edits ──
  const setCmsServer = (i: number, field: keyof CmsServerDraft, v: string) =>
    setNetCmsEdit((e) => {
      const servers = e.servers.map((s, idx) => idx === i ? { ...s, [field]: v } : s)
      return { ...e, servers }
    })

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">N62 Unit Status</h2>
        <Button variant="outline" size="sm" onClick={refreshAll} disabled={allLoading} className="flex items-center gap-2">
          {allLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh All
        </Button>
      </div>

      {/* Row 1: Device Info | Vehicle & Driver | System Time */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Device Info — read-only */}
        <SectionCard title="Device Info" icon={Cpu} state={devInfo} onRefresh={refreshDevInfo}>
          <InfoRow label="Device Name"       value={devInfo.data?.DevName} />
          <InfoRow label="Device ID"         value={devInfo.data?.DevId} />
          <InfoRow label="CPU Temp" value={basicStatus.data?.cpu_temp_c !== undefined ? `${basicStatus.data.cpu_temp_c}°C` : undefined} />
          <InfoRow label="G-Sensor" value={basicStatus.data?.g_sensor ?? (basicStatus.data?.g_x !== undefined ? `X:${basicStatus.data.g_x} Y:${basicStatus.data.g_y} Z:${basicStatus.data.g_z}` : undefined)} />
          <InfoRow label="AI Status"         value={devInfo.data?.AiStatus} />
          <InfoRow label="Software Version"  value={devInfo.data?.SoftVer} />
          <InfoRow label="MCU Version"       value={devInfo.data?.McuVer} />
          <InfoRow label="Algorithm Version" value={devInfo.data?.AlgVer} />
          <InfoRow label="Resource Version"  value={devInfo.data?.ResVer} />
          <InfoRow label="Chip ID" value={devInfo.data?.ChipId ? <span className="font-mono text-xs">{devInfo.data.ChipId}</span> : undefined} />
        </SectionCard>

        {/* Vehicle & Driver */}
        <SectionCard title="Vehicle & Driver" icon={Car} state={vehBase} onRefresh={refreshVehBase}>
          <>
            <InfoRow label="Car Plate" value={vehBase.data?.CarPlate} />
            <InfoRow label="Company" value={vehBase.data?.Company} />
            <InfoRow label="Driver Name" value={vehBase.data?.DriverName} />
            <InfoRow label="Driver License" value={vehBase.data?.DriverLic} />
            <InfoRow label="Phone Number" value={vehBase.data?.PhoneNum} />
            <InfoRow label="Assembly Date" value={vehBase.data?.AssemblyDate} />
          </>
        </SectionCard>

        {/* System Time */}
        <SectionCard title="System Time" icon={Clock} state={sysTime} onRefresh={refreshSysTime}>
          <>
            <InfoRow label="Date / Time" value={sysTime.data?.DateTime} />
            <InfoRow label="Timezone" value={sysTime.data?.Zone} />
            <InfoRow label="GPS Time Sync" value={sysTime.data?.GpsSync !== undefined ? enabledDisabled(sysTime.data.GpsSync) : undefined} />
            <InfoRow label="NTP Sync" value={sysTime.data?.NtpSync} />
            <InfoRow label="Date Format" value={sysTime.data?.DateFormat !== undefined ? (sysTime.data.DateFormat === 0 ? "DD/MM/YYYY" : "YYYY/MM/DD") : undefined} />
            <InfoRow label="Time Format" value={sysTime.data?.TimeFormat !== undefined ? (sysTime.data.TimeFormat === 0 ? "24-hour" : "12-hour") : undefined} />
          </>
        </SectionCard>

      </div>

      {/* Row 2: 4G Network | WiFi | CMS Servers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* 4G Status */}
        <SectionCard title="4G Status" icon={Signal} state={net4g} onRefresh={refreshNet4g}>
          <>
            <InfoRow label="State" value={net4g.data?.State ?? net4g.data?.NetworkType ?? (net4g.data?.Enable === 1 ? "4G" : undefined)} />
            <InfoRow label="Mode" value={net4g.data?.WorkMode ?? net4g.data?.ModeName ?? net4g.data?.Mode} />
            <InfoRow label="SIM State" value={net4g.data?.SimState ?? net4g.data?.SIMState ?? net4g.data?.SimStatus ?? "Exist"} />
            <InfoRow label="Signal" value={net4g.data?.Signal ?? net4g.data?.Rssi ?? net4g.data?.RSSI ?? (basicStatus.data?.network_signal !== undefined ? `-${basicStatus.data.network_signal}` : undefined)} />
            <InfoRow label="IP Address" value={net4g.data?.IpAddress ?? net4g.data?.IP ?? net4g.data?.Ip} />
            <InfoRow label="IMSI" value={net4g.data?.IMSI ?? net4g.data?.Imsi} />
            <InfoRow label="IMEI" value={net4g.data?.IMEI ?? net4g.data?.Imei} />
            <InfoRow label="Operator" value={net4g.data?.Operator ?? net4g.data?.Carrier} />
            <InfoRow label="4G Model Ver" value={net4g.data?.ModelVer ?? net4g.data?.ModelVersion ?? net4g.data?.ModuleVer} />
          </>
        </SectionCard>

        {/* WiFi Status */}
        <SectionCard title="WiFi Status" icon={Wifi} state={netWifi} onRefresh={refreshNetWifi}>
          <>
            <InfoRow label="State" value={netWifi.data?.State ?? (netWifi.data?.Enable === 1 ? "ready" : undefined)} />
            <InfoRow label="Mode" value={netWifi.data?.ModeName ?? (netWifi.data?.Mode !== undefined ? (["AP", "Client", "AP+Client"][netWifi.data.Mode] ?? String(netWifi.data.Mode)) : undefined)} />
            <InfoRow label="SSID" value={netWifi.data?.SSID} />
            <InfoRow label="Signal" value={netWifi.data?.Signal ?? netWifi.data?.Rssi ?? netWifi.data?.RSSI} />
            <InfoRow label="IP" value={netWifi.data?.IP ?? netWifi.data?.IpAddress ?? netWifi.data?.Ip} />
          </>
        </SectionCard>

        {/* CMS Servers */}
        <SectionCard title="CMS Servers" icon={Server} state={netCms} onRefresh={refreshNetCms}>
          {netCms.data && (
            <div className="space-y-3">
              {Array.from({ length: netCms.data.ChnNum ?? 0 }, (_, i) => {
                const key = `Server_${String(i).padStart(2, "0")}`
                const srv = netCms.data[key]
                if (!srv) return null
                return (
                  <div key={i} className="rounded border border-gray-100 p-2.5 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">Server {i}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${srv.Enable ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                        {srv.Enable ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="text-gray-600 font-mono text-xs break-all">{srv.ServersAddr || "—"}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Connection State: {srv.Enable ? "Configured" : "Disabled"} • Protocol: {srv.Protocol !== undefined ? ["TCP", "UDP", "TCP+UDP", "JT808"][srv.Protocol] ?? srv.Protocol : "—"} • Visit: {srv.VisitType === 0 ? "Domain" : "IP"}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

      </div>

      {/* Row 3: GPS Status | SD Card Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* GPS Status */}
        <SectionCard title="GPS Status" icon={Navigation} state={vehPos} onRefresh={refreshVehPos}>
          <>
            <InfoRow label="State" value={vehPos.data?.State ?? vehPos.data?.GpsState ?? "normal"} />
            <InfoRow label="Mode" value={vehPos.data?.Mode ?? vehPos.data?.GpsModeName ?? (vehPos.data?.GpsMode !== undefined ? ([, "Prohibited", "GPS Only", "GNSS"][vehPos.data.GpsMode] ?? String(vehPos.data.GpsMode)) : undefined)} />
            <InfoRow label="Satellite Count" value={vehPos.data?.SatelliteCount ?? vehPos.data?.Satellites ?? basicStatus.data?.satellites} />
            <InfoRow label="Speed" value={vehPos.data?.Speed ?? vehPos.data?.Spd} />
            <InfoRow label="Angle" value={vehPos.data?.Angle ?? vehPos.data?.Direction} />
            <InfoRow label="Antenna State" value={vehPos.data?.AntennaState ?? vehPos.data?.GpsAntennaState ?? "Normal"} />
            <InfoRow label="Long/Lat" value={vehPos.data?.LongLat ?? vehPos.data?.GpsPos ?? vehPos.data?.Position} />
            <InfoRow label="Mileage (KM)" value={vehPos.data?.Mileage ?? vehPos.data?.MileageKm} />
          </>
        </SectionCard>

        {/* SD Card Storage — read-only (push data) */}
        <SectionCard title="SD Card Storage" icon={HardDrive} state={sdHealth} onRefresh={refreshSdHealth}>
          {sdHealth.data && (() => {
            const cards = sdHealth.data?.sd_cards
            if (!cards || cards.count === 0) return <p className="text-sm text-gray-500">No SD cards detected</p>
            return (
              <>
                <InfoRow label="SD Cards" value={String(cards.count)} />
                {Array.from({ length: cards.count }, (_, i) => {
                  const totalMb  = cards.total_mb?.[i]     ?? 0
                  const remainMb = cards.remaining_mb?.[i] ?? 0
                  const usedMb   = totalMb - remainMb
                  const usedPct  = totalMb > 0 ? Math.round((usedMb / totalMb) * 100) : 0
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Card {i} used</span>
                        <span className="font-medium text-gray-900">{usedPct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-2 rounded-full ${usedPct > 90 ? "bg-red-500" : usedPct > 70 ? "bg-orange-400" : "bg-blue-500"}`} style={{ width: `${usedPct}%` }} />
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {formatMb(usedMb)} used of {formatMb(totalMb)} • {formatMb(remainMb)} free
                      </div>
                    </div>
                  )
                })}
                {sdHealth.data?.stale && (
                  <p className="text-xs text-orange-500 mt-1">Data may be stale (age: {Math.round((sdHealth.data.age_ms ?? 0) / 1000)}s)</p>
                )}
              </>
            )
          })()}
        </SectionCard>

      </div>

      {/* Row 4: Terminal Attributes */}
      <div className="grid grid-cols-1 gap-5">
        {/* Terminal Attributes — read-only */}
        <SectionCard title="Terminal Attributes" icon={Radio} state={termAttr} onRefresh={refreshTermAttr}>
          {termAttr.data && typeof termAttr.data === "object" && (
            <div>
              {Object.entries(termAttr.data)
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([key, value]) => (
                  <InfoRow key={key} label={key} value={typeof value === "object" ? <span className="font-mono text-xs">{JSON.stringify(value)}</span> : String(value)} />
                ))}
            </div>
          )}
        </SectionCard>

      </div>
    </div>
  )
}
