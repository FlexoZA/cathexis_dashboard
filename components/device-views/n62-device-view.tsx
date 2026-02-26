"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Cpu,
  Wifi,
  Signal,
  HardDrive,
  Car,
  Clock,
  Navigation,
  Video,
  Server,
  RefreshCw,
  Loader2,
  Radio,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface N62DeviceViewProps {
  serial: string
}

interface DataState {
  data: any | null
  loading: boolean
  error: string | null
  loadedAt: string | null
}

const INIT_STATE: DataState = { data: null, loading: false, error: null, loadedAt: null }

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
    if (!res.ok) {
      return { data: null, error: json?.error || `Request failed (${res.status})` }
    }
    return { data: json?.data ?? null, error: null }
  } catch (err: any) {
    return {
      data: null,
      error: err?.name === "AbortError" ? "Request timed out" : (err?.message ?? "Request failed"),
    }
  }
}

async function fetchSdHealth(
  serial: string,
  signal?: AbortSignal
): Promise<{ data: any; error: string | null }> {
  try {
    const res = await fetch(`/api/units/${encodeURIComponent(serial)}/sd-health`, {
      cache: "no-store",
      signal,
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      return { data: null, error: json?.error || `SD health request failed (${res.status})` }
    }
    return { data: json?.data ?? null, error: null }
  } catch (err: any) {
    return {
      data: null,
      error: err?.name === "AbortError" ? "Request timed out" : (err?.message ?? "Failed to fetch SD health"),
    }
  }
}

function settled(
  setter: React.Dispatch<React.SetStateAction<DataState>>,
  result: { data: any; error: string | null }
) {
  setter({ data: result.data, loading: false, error: result.error, loadedAt: new Date().toISOString() })
}

function startLoading(setter: React.Dispatch<React.SetStateAction<DataState>>) {
  setter((prev) => ({ ...prev, loading: true, error: null }))
}

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

function SectionCard({
  title,
  icon: Icon,
  state,
  onRefresh,
  children,
}: {
  title: string
  icon: React.ElementType
  state: DataState
  onRefresh: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          {title}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={state.loading}
          className="h-7 w-7 p-0"
        >
          {state.loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
      {state.loadedAt && (
        <p className="text-xs text-gray-400 mb-3">
          Loaded: {new Date(state.loadedAt).toLocaleString()}
        </p>
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
      {state.error && state.data && (
        <p className="text-xs text-red-500 mt-2">{state.error}</p>
      )}
    </div>
  )
}

function yesNo(val: unknown): string {
  if (val === 1 || val === true || val === "1") return "Yes"
  if (val === 0 || val === false || val === "0") return "No"
  return String(val ?? "—")
}

function enabledDisabled(val: unknown): string {
  if (val === 1 || val === true) return "Enabled"
  if (val === 0 || val === false) return "Disabled"
  return String(val ?? "—")
}

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

export function N62DeviceView({ serial }: N62DeviceViewProps) {
  const [devInfo, setDevInfo] = useState<DataState>({ ...INIT_STATE })
  const [sysTime, setSysTime] = useState<DataState>({ ...INIT_STATE })
  const [vehBase, setVehBase] = useState<DataState>({ ...INIT_STATE })
  const [vehPos, setVehPos] = useState<DataState>({ ...INIT_STATE })
  const [net4g, setNet4g] = useState<DataState>({ ...INIT_STATE })
  const [netWifi, setNetWifi] = useState<DataState>({ ...INIT_STATE })
  const [netCms, setNetCms] = useState<DataState>({ ...INIT_STATE })
  const [recAttr, setRecAttr] = useState<DataState>({ ...INIT_STATE })
  const [sdHealth, setSdHealth] = useState<DataState>({ ...INIT_STATE })
  const [termAttr, setTermAttr] = useState<DataState>({ ...INIT_STATE })

  const refreshDevInfo = useCallback(() => {
    startLoading(setDevInfo)
    postCommand(serial, { type: "request_config", payload: { paramType: "GenDevInfo" } }).then((r) =>
      settled(setDevInfo, r)
    )
  }, [serial])

  const refreshSysTime = useCallback(() => {
    startLoading(setSysTime)
    postCommand(serial, { type: "request_config", payload: { paramType: "GenDateTime" } }).then((r) =>
      settled(setSysTime, r)
    )
  }, [serial])

  const refreshVehBase = useCallback(() => {
    startLoading(setVehBase)
    postCommand(serial, { type: "request_config", payload: { paramType: "VehBaseInfo" } }).then((r) =>
      settled(setVehBase, r)
    )
  }, [serial])

  const refreshVehPos = useCallback(() => {
    startLoading(setVehPos)
    postCommand(serial, { type: "request_config", payload: { paramType: "VehPosition" } }).then((r) =>
      settled(setVehPos, r)
    )
  }, [serial])

  const refreshNet4g = useCallback(() => {
    startLoading(setNet4g)
    postCommand(serial, { type: "request_config", payload: { paramType: "NetXg" } }).then((r) =>
      settled(setNet4g, r)
    )
  }, [serial])

  const refreshNetWifi = useCallback(() => {
    startLoading(setNetWifi)
    postCommand(serial, { type: "request_config", payload: { paramType: "NetWifi" } }).then((r) =>
      settled(setNetWifi, r)
    )
  }, [serial])

  const refreshNetCms = useCallback(() => {
    startLoading(setNetCms)
    postCommand(serial, { type: "request_config", payload: { paramType: "NetCms" } }).then((r) =>
      settled(setNetCms, r)
    )
  }, [serial])

  const refreshRecAttr = useCallback(() => {
    startLoading(setRecAttr)
    postCommand(serial, { type: "request_config", payload: { paramType: "RecAttr" } }).then((r) =>
      settled(setRecAttr, r)
    )
  }, [serial])

  const refreshSdHealth = useCallback(() => {
    startLoading(setSdHealth)
    fetchSdHealth(serial).then((r) => settled(setSdHealth, r))
  }, [serial])

  const refreshTermAttr = useCallback(() => {
    startLoading(setTermAttr)
    postCommand(serial, { type: "request_environment" }).then((r) => settled(setTermAttr, r))
  }, [serial])

  const refreshAll = useCallback(() => {
    const setters = [
      setDevInfo, setSysTime, setVehBase, setVehPos,
      setNet4g, setNetWifi, setNetCms, setRecAttr, setSdHealth, setTermAttr,
    ]
    setters.forEach((s) => startLoading(s))

    const controller = new AbortController()
    const sig = controller.signal

    Promise.allSettled([
      postCommand(serial, { type: "request_config", payload: { paramType: "GenDevInfo" } }, sig).then((r) => settled(setDevInfo, r)),
      postCommand(serial, { type: "request_config", payload: { paramType: "GenDateTime" } }, sig).then((r) => settled(setSysTime, r)),
      postCommand(serial, { type: "request_config", payload: { paramType: "VehBaseInfo" } }, sig).then((r) => settled(setVehBase, r)),
      postCommand(serial, { type: "request_config", payload: { paramType: "VehPosition" } }, sig).then((r) => settled(setVehPos, r)),
      postCommand(serial, { type: "request_config", payload: { paramType: "NetXg" } }, sig).then((r) => settled(setNet4g, r)),
      postCommand(serial, { type: "request_config", payload: { paramType: "NetWifi" } }, sig).then((r) => settled(setNetWifi, r)),
      postCommand(serial, { type: "request_config", payload: { paramType: "NetCms" } }, sig).then((r) => settled(setNetCms, r)),
      postCommand(serial, { type: "request_config", payload: { paramType: "RecAttr" } }, sig).then((r) => settled(setRecAttr, r)),
      fetchSdHealth(serial, sig).then((r) => settled(setSdHealth, r)),
      postCommand(serial, { type: "request_environment" }, sig).then((r) => settled(setTermAttr, r)),
    ])

    console.log("DEBUG::N62DeviceView", "Refresh all started", { serial })
  }, [serial])

  useEffect(() => {
    if (!serial) return

    console.log("DEBUG::N62DeviceView", "Auto-fetching all N62 data", { serial })

    const controller = new AbortController()
    const sig = controller.signal

    const setters = [
      setDevInfo, setSysTime, setVehBase, setVehPos,
      setNet4g, setNetWifi, setNetCms, setRecAttr, setSdHealth, setTermAttr,
    ]
    setters.forEach((s) => startLoading(s))

    Promise.allSettled([
      postCommand(serial, { type: "request_config", payload: { paramType: "GenDevInfo" } }, sig).then((r) => settled(setDevInfo, r)),
      postCommand(serial, { type: "request_config", payload: { paramType: "GenDateTime" } }, sig).then((r) => settled(setSysTime, r)),
      postCommand(serial, { type: "request_config", payload: { paramType: "VehBaseInfo" } }, sig).then((r) => settled(setVehBase, r)),
      postCommand(serial, { type: "request_config", payload: { paramType: "VehPosition" } }, sig).then((r) => settled(setVehPos, r)),
      postCommand(serial, { type: "request_config", payload: { paramType: "NetXg" } }, sig).then((r) => settled(setNet4g, r)),
      postCommand(serial, { type: "request_config", payload: { paramType: "NetWifi" } }, sig).then((r) => settled(setNetWifi, r)),
      postCommand(serial, { type: "request_config", payload: { paramType: "NetCms" } }, sig).then((r) => settled(setNetCms, r)),
      postCommand(serial, { type: "request_config", payload: { paramType: "RecAttr" } }, sig).then((r) => settled(setRecAttr, r)),
      fetchSdHealth(serial, sig).then((r) => settled(setSdHealth, r)),
      postCommand(serial, { type: "request_environment" }, sig).then((r) => settled(setTermAttr, r)),
    ])

    return () => controller.abort()
  }, [serial])

  const allLoading = [devInfo, sysTime, vehBase, vehPos, net4g, netWifi, netCms, recAttr, sdHealth, termAttr].some(
    (s) => s.loading
  )

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">N62 Unit Status</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshAll}
          disabled={allLoading}
          className="flex items-center gap-2"
        >
          {allLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh All
        </Button>
      </div>

      {/* Row 1: Device Info | Vehicle & Driver | System Time */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="Device Info" icon={Cpu} state={devInfo} onRefresh={refreshDevInfo}>
          <InfoRow label="Device Name" value={devInfo.data?.DevName} />
          <InfoRow label="Device ID" value={devInfo.data?.DevId} />
          <InfoRow label="AI Status" value={devInfo.data?.AiStatus} />
          <InfoRow label="Software Version" value={devInfo.data?.SoftVer} />
          <InfoRow label="MCU Version" value={devInfo.data?.McuVer} />
          <InfoRow label="Algorithm Version" value={devInfo.data?.AlgVer} />
          <InfoRow label="Resource Version" value={devInfo.data?.ResVer} />
          <InfoRow
            label="Chip ID"
            value={
              devInfo.data?.ChipId ? (
                <span className="font-mono text-xs">{devInfo.data.ChipId}</span>
              ) : undefined
            }
          />
        </SectionCard>

        <SectionCard title="Vehicle & Driver" icon={Car} state={vehBase} onRefresh={refreshVehBase}>
          <InfoRow label="Car Plate" value={vehBase.data?.CarPlate} />
          <InfoRow label="Company" value={vehBase.data?.Company} />
          <InfoRow label="Driver Name" value={vehBase.data?.DriverName} />
          <InfoRow label="Driver License" value={vehBase.data?.DriverLic} />
          <InfoRow label="Phone Number" value={vehBase.data?.PhoneNum} />
          <InfoRow label="Assembly Date" value={vehBase.data?.AssemblyDate} />
        </SectionCard>

        <SectionCard title="System Time" icon={Clock} state={sysTime} onRefresh={refreshSysTime}>
          <InfoRow label="Date / Time" value={sysTime.data?.DateTime} />
          <InfoRow label="Timezone" value={sysTime.data?.Zone} />
          <InfoRow label="GPS Time Sync" value={sysTime.data?.GpsSync !== undefined ? enabledDisabled(sysTime.data.GpsSync) : undefined} />
          <InfoRow label="NTP Sync" value={sysTime.data?.NtpSync} />
          <InfoRow
            label="Date Format"
            value={
              sysTime.data?.DateFormat !== undefined
                ? sysTime.data.DateFormat === 0 ? "DD/MM/YYYY" : sysTime.data.DateFormat === 1 ? "YYYY/MM/DD" : String(sysTime.data.DateFormat)
                : undefined
            }
          />
          <InfoRow
            label="Time Format"
            value={
              sysTime.data?.TimeFormat !== undefined
                ? sysTime.data.TimeFormat === 0 ? "24-hour" : "12-hour"
                : undefined
            }
          />
        </SectionCard>
      </div>

      {/* Row 2: 4G Network | WiFi | CMS Servers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="4G Network" icon={Signal} state={net4g} onRefresh={refreshNet4g}>
          <InfoRow label="Enabled" value={net4g.data?.Enable !== undefined ? enabledDisabled(net4g.data.Enable) : undefined} />
          <InfoRow label="APN" value={net4g.data?.APN?.trim()} />
          <InfoRow
            label="Mode"
            value={
              net4g.data?.Mode !== undefined
                ? net4g.data.Mode === 0 ? "Automatic" : "Manual"
                : undefined
            }
          />
          <InfoRow
            label="Auth Type"
            value={
              net4g.data?.AuthType !== undefined
                ? ["None", "PAP", "CHAP", "PAP+CHAP"][net4g.data.AuthType] ?? String(net4g.data.AuthType)
                : undefined
            }
          />
          <InfoRow label="Dial Number" value={net4g.data?.CenterNum} />
          <InfoRow label="Redial Interval" value={net4g.data?.RedialInter !== undefined ? `${net4g.data.RedialInter}s` : undefined} />
          <InfoRow label="Abnormal Restart" value={net4g.data?.AbRestartEn !== undefined ? enabledDisabled(net4g.data.AbRestartEn) : undefined} />
        </SectionCard>

        <SectionCard title="WiFi" icon={Wifi} state={netWifi} onRefresh={refreshNetWifi}>
          <InfoRow label="Enabled" value={netWifi.data?.Enable !== undefined ? enabledDisabled(netWifi.data.Enable) : undefined} />
          <InfoRow label="SSID" value={netWifi.data?.SSID} />
          <InfoRow
            label="Mode"
            value={
              netWifi.data?.Mode !== undefined
                ? ["AP", "Client", "AP+Client"][netWifi.data.Mode] ?? String(netWifi.data.Mode)
                : undefined
            }
          />
          <InfoRow
            label="Encryption"
            value={
              netWifi.data?.EncryptType !== undefined
                ? ["None", "WEP", "WPA", "WPA2"][netWifi.data.EncryptType] ?? String(netWifi.data.EncryptType)
                : undefined
            }
          />
          <InfoRow label="DHCP" value={netWifi.data?.DhcpEn !== undefined ? enabledDisabled(netWifi.data.DhcpEn) : undefined} />
        </SectionCard>

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
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full border ${
                          srv.Enable
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {srv.Enable ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="text-gray-600 font-mono text-xs break-all">{srv.ServersAddr || "—"}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Protocol: {srv.Protocol !== undefined ? ["TCP", "UDP", "TCP+UDP", "JT808"][srv.Protocol] ?? srv.Protocol : "—"}{" "}
                      • Visit: {srv.VisitType === 0 ? "Domain" : "IP"}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Row 3: GPS Settings | Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="GPS Settings" icon={Navigation} state={vehPos} onRefresh={refreshVehPos}>
          <InfoRow
            label="GPS Mode"
            value={
              vehPos.data?.GpsMode !== undefined
                ? vehPos.data.GpsMode === 1 ? "Prohibited" : vehPos.data.GpsMode === 2 ? "GPS Only" : vehPos.data.GpsMode === 3 ? "GNSS" : String(vehPos.data.GpsMode)
                : undefined
            }
          />
          <InfoRow
            label="Upload Interval"
            value={vehPos.data?.GpsUpInterval !== undefined ? `${vehPos.data.GpsUpInterval}s` : undefined}
          />
          <InfoRow label="Batch Count" value={vehPos.data?.GpsBatchNum} />
          <InfoRow
            label="Speed Correction Threshold"
            value={vehPos.data?.SpdCorrV !== undefined ? `${vehPos.data.SpdCorrV} km/h` : undefined}
          />
          <InfoRow label="Speed Filter" value={vehPos.data?.SpdFilter} />
        </SectionCard>

        <SectionCard title="SD Card Storage" icon={HardDrive} state={sdHealth} onRefresh={refreshSdHealth}>
          {sdHealth.data && (
            <div className="space-y-3">
              {(() => {
                const cards = sdHealth.data?.sd_cards
                if (!cards || cards.count === 0) {
                  return <p className="text-sm text-gray-500">No SD cards detected</p>
                }
                return (
                  <>
                    <InfoRow label="SD Cards" value={String(cards.count)} />
                    {Array.from({ length: cards.count }, (_, i) => {
                      const totalMb = cards.total_mb?.[i] ?? 0
                      const remainMb = cards.remaining_mb?.[i] ?? 0
                      const usedMb = totalMb - remainMb
                      const usedPct = totalMb > 0 ? Math.round((usedMb / totalMb) * 100) : 0
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">Card {i} used</span>
                            <span className="font-medium text-gray-900">{usedPct}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${usedPct > 90 ? "bg-red-500" : usedPct > 70 ? "bg-orange-400" : "bg-blue-500"}`}
                              style={{ width: `${usedPct}%` }}
                            />
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {formatMb(usedMb)} used of {formatMb(totalMb)} • {formatMb(remainMb)} free
                          </div>
                        </div>
                      )
                    })}
                    {sdHealth.data?.stale && (
                      <p className="text-xs text-orange-500">
                        Data may be stale (age: {Math.round((sdHealth.data.age_ms ?? 0) / 1000)}s)
                      </p>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Row 4: Recording Attributes | Terminal Attributes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Recording" icon={Video} state={recAttr} onRefresh={refreshRecAttr}>
          <InfoRow
            label="Mode"
            value={
              recAttr.data?.Mode !== undefined
                ? recAttr.data.Mode === 0 ? "Auto (continuous)" : recAttr.data.Mode === 1 ? "Manual" : String(recAttr.data.Mode)
                : undefined
            }
          />
          <InfoRow
            label="Clip Duration"
            value={recAttr.data?.Duration !== undefined ? `${recAttr.data.Duration} min` : undefined}
          />
          <InfoRow
            label="Pre-event Buffer"
            value={recAttr.data?.PreDuration !== undefined ? `${recAttr.data.PreDuration}s` : undefined}
          />
          <InfoRow
            label="Save Days"
            value={recAttr.data?.SaveDays !== undefined ? `${recAttr.data.SaveDays} days` : undefined}
          />
          <InfoRow
            label="Stream Type"
            value={
              recAttr.data?.StreamType !== undefined
                ? recAttr.data.StreamType === 0 ? "Main + Sub" : recAttr.data.StreamType === 1 ? "Main only" : String(recAttr.data.StreamType)
                : undefined
            }
          />
          <InfoRow
            label="File Format"
            value={
              recAttr.data?.FileFormat !== undefined
                ? recAttr.data.FileFormat === 0 ? "MP4" : recAttr.data.FileFormat === 1 ? "AVI" : String(recAttr.data.FileFormat)
                : undefined
            }
          />
          <InfoRow label="Encryption" value={recAttr.data?.Encrypt} />
        </SectionCard>

        <SectionCard title="Terminal Attributes" icon={Radio} state={termAttr} onRefresh={refreshTermAttr}>
          {termAttr.data && typeof termAttr.data === "object" && (
            <div>
              {Object.entries(termAttr.data)
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([key, value]) => (
                  <InfoRow
                    key={key}
                    label={key}
                    value={
                      typeof value === "object" ? (
                        <span className="font-mono text-xs">{JSON.stringify(value)}</span>
                      ) : (
                        String(value)
                      )
                    }
                  />
                ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
