"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Cpu, Server, Wifi, Signal, Clock, Car, RefreshCw, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────

interface HowenDeviceViewProps { serial: string }

type Segment = Record<string, any>
type ConfigMap = Record<string, Segment>

interface DataState {
  sc: ConfigMap | null
  loading: boolean
  error: string | null
  loadedAt: string | null
}

const INIT_STATE: DataState = { sc: null, loading: false, error: null, loadedAt: null }

// Read-only info segments (see docs/HOWEN_API.md §4.2.5 "Info" screen).
const INFO_MODULES = ["VERSIONINFO", "JTBASE", "SERVER", "DIALUP", "WIFI", "CLOCK"]

// Network type codes (`at`) from docs/HOWEN_API.md §10.
const NETWORK_TYPE_LABELS: Record<string, string> = {
  "0": "Unknown",
  "1": "Wired",
  "2": "WiFi",
  "3": "2G",
  "4": "3G",
  "5": "4G",
  "6": "5G",
  "7": "WiFi + cellular proxy",
  "8": "Cable + cellular proxy",
}

// ─── API helper ───────────────────────────────────────────────────────────────

async function fetchHowenConfig(
  serial: string,
  modules: string[],
  signal?: AbortSignal
): Promise<{ sc: ConfigMap | null; error: string | null }> {
  try {
    const res = await fetch(`/api/units/${encodeURIComponent(serial)}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "request_config", payload: { modules } }),
      cache: "no-store",
      signal,
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) return { sc: null, error: json?.error || `Request failed (${res.status})` }
    const sc = (json?.data?.sc && typeof json.data.sc === "object") ? (json.data.sc as ConfigMap) : {}
    return { sc, error: null }
  } catch (err: any) {
    return { sc: null, error: err?.name === "AbortError" ? "Request timed out" : (err?.message ?? "Request failed") }
  }
}

// ─── Segment helpers ──────────────────────────────────────────────────────────

/** Look up a segment case-insensitively — the device normalises segment casing (§3 quirk #2). */
function getSegment(sc: ConfigMap | null, name: string): Segment | null {
  if (!sc) return null
  const lower = name.toLowerCase()
  for (const key of Object.keys(sc)) {
    if (key.toLowerCase() === lower) return sc[key]
  }
  return null
}

function asText(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

// ─── UI building blocks ───────────────────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-gray-900 text-right break-all ${mono ? "font-mono text-xs" : ""}`}>
        {value !== undefined && value !== null && value !== "" ? value : "—"}
      </span>
    </div>
  )
}

function SectionCard({ title, icon: Icon, state, children }: {
  title: string
  icon: React.ElementType
  state: DataState
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-gray-500" />
        {title}
      </h3>
      {state.loading && !state.loadedAt ? (
        <div className="flex items-center gap-2 py-6 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : state.error && !state.sc ? (
        <p className="text-sm text-red-500 py-2">{state.error}</p>
      ) : (
        children
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HowenDeviceView({ serial }: HowenDeviceViewProps) {
  const [state, setState] = useState<DataState>({ ...INIT_STATE })

  const load = useCallback((signal?: AbortSignal) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    fetchHowenConfig(serial, INFO_MODULES, signal).then((result) => {
      if (signal?.aborted) return
      setState({ sc: result.sc, loading: false, error: result.error, loadedAt: new Date().toISOString() })
    })
  }, [serial])

  useEffect(() => {
    if (!serial) return
    console.log("DEBUG::HowenDeviceView", { action: "auto-fetch info", serial })
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [serial, load])

  const version = getSegment(state.sc, "VERSIONINFO")
  const identity = getSegment(state.sc, "JTBASE")
  const servers = getSegment(state.sc, "SERVER")
  const dialup = getSegment(state.sc, "DIALUP")
  const wifi = getSegment(state.sc, "WIFI")
  const clock = getSegment(state.sc, "CLOCK")

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Howen Unit Info</h2>
          {state.loadedAt && (
            <p className="text-xs text-gray-400 mt-0.5">Loaded: {new Date(state.loadedAt).toLocaleString()}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} disabled={state.loading} className="flex items-center gap-2">
          {state.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      {state.error && state.sc && <p className="text-xs text-red-500">{state.error}</p>}

      {/* Row 1: Firmware | Identity | Clock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Firmware versions (VERSIONINFO) */}
        <SectionCard title="Firmware" icon={Cpu} state={state}>
          <InfoRow label="App" value={asText(version?.app)} />
          <InfoRow label="Kernel" value={asText(version?.kernel)} />
          <InfoRow label="MCU" value={asText(version?.mcu)} />
          <InfoRow label="Boot" value={asText(version?.boot)} />
          <InfoRow label="Root FS" value={asText(version?.rootfs)} />
          <InfoRow label="Hardware" value={asText(version?.hardware)} />
          <InfoRow label="Algorithm" value={asText(version?.alg)} />
          <InfoRow label="Extension" value={asText(version?.ext)} />
          <InfoRow label="Modem" value={asText(version?.Modem)} />
        </SectionCard>

        {/* Identity (JTBASE) */}
        <SectionCard title="Identity" icon={Car} state={state}>
          <InfoRow label="Phone Number" value={asText(identity?.phonenum)} />
          <InfoRow label="Vehicle Type" value={asText(identity?.vehilce_type ?? identity?.vehicle_type)} />
          <InfoRow label="CAN Vehicle Type" value={asText(identity?.CanVehicleType)} />
          <InfoRow label="GPS Pos Mode" value={asText(identity?.gpsPosMode)} />
          <InfoRow label="GPS Interval 1" value={asText(identity?.gpsinterval1)} />
          <InfoRow label="GPS Interval 2" value={asText(identity?.gpsinterval2)} />
          <InfoRow label="IMEI Length" value={asText(identity?.ImeiLen)} />
        </SectionCard>

        {/* Clock (CLOCK) */}
        <SectionCard title="Clock" icon={Clock} state={state}>
          <InfoRow label="Timezone" value={asText(clock?.timezone)} />
          <InfoRow label="Offset" value={asText(clock?.offset)} />
          <InfoRow label="NTP Server" value={asText(clock?.ntpserver)} />
          <InfoRow label="NTP Port" value={asText(clock?.ntpport)} />
          <InfoRow label="NTP Enabled" value={asText(clock?.switch ?? clock?.onoff)} />
        </SectionCard>

      </div>

      {/* Row 2: Central Servers */}
      <SectionCard title="Central Servers" icon={Server} state={state}>
        {servers && typeof servers === "object" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {["server0", "server1", "server2", "server3"].map((key) => {
              const srv = servers[key]
              if (!srv || typeof srv !== "object") return null
              const enabled = String(srv.enable) === "1"
              return (
                <div key={key} className="rounded border border-gray-100 p-2.5 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{key}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${enabled ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                      {enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="text-gray-600 font-mono text-xs break-all">
                    {asText(srv.mainip) ?? "—"}:{asText(srv.mainport) ?? "—"}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Backup: {asText(srv.bakip) ?? "—"}:{asText(srv.bakport) ?? "—"} • Conn type: {asText(srv.conntype) ?? "—"} • UTC zone: {asText(srv.utczone) ?? "—"}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-2">No server data available</p>
        )}
      </SectionCard>

      {/* Row 3: Mobile Network | WiFi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Mobile network (DIALUP) */}
        <SectionCard title="Mobile Network" icon={Signal} state={state}>
          <InfoRow label="APN" value={asText(dialup?.apn)} />
          <InfoRow label="User" value={asText(dialup?.user)} />
          <InfoRow label="Type" value={NETWORK_TYPE_LABELS[String(dialup?.type)] ?? asText(dialup?.type)} />
          <InfoRow label="Telco" value={asText(dialup?.Telco)} />
          <InfoRow label="Server Code" value={asText(dialup?.servercode)} />
          <InfoRow label="Enabled" value={asText(dialup?.switch)} />
        </SectionCard>

        {/* WiFi (WIFI) */}
        <SectionCard title="WiFi" icon={Wifi} state={state}>
          <InfoRow label="SSID" value={asText(wifi?.SSID)} />
          <InfoRow label="Auth Mode" value={asText(wifi?.AuthMode)} />
          <InfoRow label="Encryption" value={asText(wifi?.Encrypt)} />
          <InfoRow label="DHCP" value={asText(wifi?.Dhcp)} />
          <InfoRow label="IP Address" value={asText(wifi?.IpAddr)} mono />
          <InfoRow label="Gateway" value={asText(wifi?.GateWay)} mono />
          <InfoRow label="Open" value={asText(wifi?.isOpen)} />
        </SectionCard>

      </div>
    </div>
  )
}
