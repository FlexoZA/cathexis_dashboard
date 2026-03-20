"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, RefreshCw, Save, Settings } from "lucide-react"
import { useNotifications } from "@/components/notifications-provider"

interface N62DeviceConfigProps {
  serial: string
}

interface DataState<T> {
  data: T | null
  loading: boolean
  error: string | null
  loadedAt: string | null
}

interface GenStartUpConfig {
  Mode?: number
  DelayTime?: number
  WakeUpInteval?: number
  RunTime?: string
  PwrProtect12?: string
  PwrProtect24?: string
  RebootTime?: string
  ParamType?: string
  [key: string]: unknown
}

interface GenDateTimeConfig {
  DateTime?: string
  Zone?: string
  GpsSync?: number
  NtpSync?: string
  DateFormat?: number
  TimeFormat?: number
  ParamType?: string
  [key: string]: unknown
}

interface GenDevInfoConfig {
  DevName?: string
  DevId?: string
  AiStatus?: string
  SoftVer?: string
  McuVer?: string
  AlgVer?: string
  ResVer?: string
  ChipId?: string
  ParamType?: string
  [key: string]: unknown
}

interface GenUserConfig {
  ChnNum?: number
  Enable?: number
  User_00?: {
    Name?: string
    Password?: string
  }
  User_01?: {
    Name?: string
    Password?: string
  }
  ParamType?: string
  [key: string]: unknown
}

interface GenDstConfig {
  Enable?: number
  Mode?: number
  OffsetTime?: number
  StartTime?: string
  EndTime?: string
  ParamType?: string
  [key: string]: unknown
}

const TABS = ["general", "vehicle", "preview", "record", "alarm", "network", "peripheral", "ai"] as const
const POWER_MODE_OPTIONS = [
  { value: "0", label: "ACC" },
  { value: "1", label: "Timer" },
  { value: "2", label: "Sleep" },
]

const TIMEZONE_OPTIONS = Array.from({ length: 25 }, (_, idx) => {
  const offset = 12 - idx
  const sign = offset >= 0 ? "+" : ""
  return {
    value: `GMT${sign}${offset}`,
    label: `GMT${sign}${offset}`,
  }
})

function decodeTimezone(value?: string): string {
  const raw = String(value ?? "").trim()
  if (!raw) return "GMT+0"
  if (/^GMT[+-]\d{1,2}$/.test(raw)) return raw

  const match = raw.match(/^(-?\d+),\d+$/)
  if (match) {
    const zoneIndex = parseInt(match[1], 10)
    if (!Number.isNaN(zoneIndex)) {
      const offset = zoneIndex - 12
      if (offset >= -12 && offset <= 12) {
        const sign = offset >= 0 ? "+" : ""
        return `GMT${sign}${offset}`
      }
    }
  }

  const numeric = parseInt(raw, 10)
  if (!Number.isNaN(numeric) && numeric >= -12 && numeric <= 12) {
    const sign = numeric >= 0 ? "+" : ""
    return `GMT${sign}${numeric}`
  }

  return "GMT+0"
}

function encodeTimezone(gmtValue: string): string {
  const match = gmtValue.match(/^GMT([+-]\d{1,2})$/)
  if (!match) return "12,0"
  const offset = parseInt(match[1], 10)
  if (Number.isNaN(offset)) return "12,0"
  const zoneIndex = offset + 12
  return `${zoneIndex},0`
}

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
    return { data: null, error: err?.message ?? "Request failed" }
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
      body: JSON.stringify({
        type: "update_config",
        payload: { paramType, params: { ParamType: paramType, ...params } },
      }),
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

export function N62DeviceConfig({ serial }: N62DeviceConfigProps) {
  const { addNotification } = useNotifications()
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("general")
  const [dstState, setDstState] = useState<DataState<GenDstConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [dstEnabled, setDstEnabled] = useState<string>("0")
  const [dstOffsetTime, setDstOffsetTime] = useState<string>("0")
  const [dstMode, setDstMode] = useState<string>("0")
  const [startMonth, setStartMonth] = useState<string>("1")
  const [startWeek, setStartWeek] = useState<string>("0")
  const [startDay, setStartDay] = useState<string>("0")
  const [startTimeDst, setStartTimeDst] = useState<string>("02:00:00")
  const [endMonth, setEndMonth] = useState<string>("12")
  const [endWeek, setEndWeek] = useState<string>("0")
  const [endDay, setEndDay] = useState<string>("0")
  const [endTimeDst, setEndTimeDst] = useState<string>("02:00:00")
  const [savingDst, setSavingDst] = useState(false)
  const [dstMessage, setDstMessage] = useState<string | null>(null)
  const [userState, setUserState] = useState<DataState<GenUserConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [userEnabled, setUserEnabled] = useState<string>("0")
  const [selectedUserKey, setSelectedUserKey] = useState<"User_00" | "User_01">("User_00")
  const [selectedUserPassword, setSelectedUserPassword] = useState<string>("")
  const [savingUser, setSavingUser] = useState(false)
  const [userMessage, setUserMessage] = useState<string | null>(null)
  const [devInfoState, setDevInfoState] = useState<DataState<GenDevInfoConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [devName, setDevName] = useState<string>("")
  const [savingDevInfo, setSavingDevInfo] = useState(false)
  const [devInfoMessage, setDevInfoMessage] = useState<string | null>(null)
  const [sysTimeState, setSysTimeState] = useState<DataState<GenDateTimeConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [sysDateTime, setSysDateTime] = useState<string>("")
  const [sysZone, setSysZone] = useState<string>("GMT+0")
  const [sysGpsSync, setSysGpsSync] = useState<string>("0")
  const [sysNtpEnabled, setSysNtpEnabled] = useState<string>("0")
  const [sysNtpServer, setSysNtpServer] = useState<string>("0")
  const [sysDateFormat, setSysDateFormat] = useState<string>("0")
  const [sysTimeFormat, setSysTimeFormat] = useState<string>("0")
  const [savingSysTime, setSavingSysTime] = useState(false)
  const [sysTimeMessage, setSysTimeMessage] = useState<string | null>(null)
  const [powerState, setPowerState] = useState<DataState<GenStartUpConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [powerMode, setPowerMode] = useState<string>("0")
  const [delayTime, setDelayTime] = useState<string>("0")
  const [wakeUpInterval, setWakeUpInterval] = useState<string>("0")
  const [startTime, setStartTime] = useState<string>("06:00:00")
  const [endTime, setEndTime] = useState<string>("23:00:00")
  const [pwr12Enabled, setPwr12Enabled] = useState<string>("0")
  const [pwr12Thr, setPwr12Thr] = useState<string>("90")
  const [pwr24Enabled, setPwr24Enabled] = useState<string>("0")
  const [pwr24Thr, setPwr24Thr] = useState<string>("220")
  const [savingPower, setSavingPower] = useState(false)
  const [powerMessage, setPowerMessage] = useState<string | null>(null)

  const loadUser = useCallback(() => {
    setUserState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "GenUser" } }).then((result) => {
      const data = (result.data ?? null) as GenUserConfig | null
      setUserState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })

      setUserEnabled(String(data?.Enable ?? 0))
      const initialUserKey: "User_00" | "User_01" = data?.User_00 ? "User_00" : "User_01"
      setSelectedUserKey(initialUserKey)
      const initialPassword = String(data?.[initialUserKey]?.Password ?? "")
      setSelectedUserPassword(initialPassword)
    })
  }, [serial])

  const loadDst = useCallback(() => {
    setDstState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "GenDst" } }).then((result) => {
      const data = (result.data ?? null) as GenDstConfig | null
      setDstState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })

      setDstEnabled(String(data?.Enable ?? 0))
      setDstOffsetTime(String(data?.OffsetTime ?? 0))
      setDstMode(String(data?.Mode ?? 0))

      const [sMonth = "1", sWeek = "0", sDay = "0", sTime = "02:00:00"] = String(data?.StartTime ?? "").split(",")
      setStartMonth(sMonth)
      setStartWeek(sWeek)
      setStartDay(sDay)
      setStartTimeDst(sTime)

      const [eMonth = "12", eWeek = "0", eDay = "0", eTime = "02:00:00"] = String(data?.EndTime ?? "").split(",")
      setEndMonth(eMonth)
      setEndWeek(eWeek)
      setEndDay(eDay)
      setEndTimeDst(eTime)
    })
  }, [serial])

  const loadDeviceInfo = useCallback(() => {
    setDevInfoState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "GenDevInfo" } }).then((result) => {
      const data = (result.data ?? null) as GenDevInfoConfig | null
      setDevInfoState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setDevName(String(data?.DevName ?? ""))
    })
  }, [serial])

  const loadPower = useCallback(() => {
    setPowerState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "GenStartUp" } }).then((result) => {
      const data = (result.data ?? null) as GenStartUpConfig | null
      setPowerState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      if (data?.Mode !== undefined) {
        setPowerMode(String(data.Mode))
      }
      setDelayTime(String(data?.DelayTime ?? 0))
      setWakeUpInterval(String(data?.WakeUpInteval ?? 0))
      const [nextStartTime = "06:00:00", nextEndTime = "23:00:00"] = String(data?.RunTime ?? "").split(",")
      setStartTime(nextStartTime)
      setEndTime(nextEndTime)
      const [nextPwr12Enabled = "0", nextPwr12Thr = "90"] = String(data?.PwrProtect12 ?? "0,90").split(",")
      setPwr12Enabled(nextPwr12Enabled)
      setPwr12Thr(nextPwr12Thr)
      const [nextPwr24Enabled = "0", nextPwr24Thr = "220"] = String(data?.PwrProtect24 ?? "0,220").split(",")
      setPwr24Enabled(nextPwr24Enabled)
      setPwr24Thr(nextPwr24Thr)
    })
  }, [serial])

  const loadSystemTime = useCallback(() => {
    setSysTimeState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "GenDateTime" } }).then((result) => {
      const data = (result.data ?? null) as GenDateTimeConfig | null
      setSysTimeState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setSysDateTime(String(data?.DateTime ?? ""))
      setSysZone(decodeTimezone(String(data?.Zone ?? "")))
      setSysGpsSync(String(data?.GpsSync ?? 0))
      const [nextNtpEnabled = "0", nextNtpServer = "0"] = String(data?.NtpSync ?? "0,0").split(",")
      setSysNtpEnabled(nextNtpEnabled)
      setSysNtpServer(nextNtpServer)
      setSysDateFormat(String(data?.DateFormat ?? 0))
      setSysTimeFormat(String(data?.TimeFormat ?? 0))
    })
  }, [serial])

  useEffect(() => {
    if (!serial) return
    loadDst()
    loadUser()
    loadDeviceInfo()
    loadPower()
    loadSystemTime()
  }, [serial, loadDst, loadUser, loadDeviceInfo, loadPower, loadSystemTime])

  const hasDstChange = useMemo(() => {
    if (!dstState.data) return false
    const nextStart = `${startMonth},${startWeek},${startDay},${startTimeDst}`
    const nextEnd = `${endMonth},${endWeek},${endDay},${endTimeDst}`
    return (
      String(dstState.data.Enable ?? 0) !== dstEnabled ||
      String(dstState.data.OffsetTime ?? 0) !== dstOffsetTime ||
      String(dstState.data.Mode ?? 0) !== dstMode ||
      String(dstState.data.StartTime ?? "") !== nextStart ||
      String(dstState.data.EndTime ?? "") !== nextEnd
    )
  }, [dstState.data, dstEnabled, dstOffsetTime, dstMode, startMonth, startWeek, startDay, startTimeDst, endMonth, endWeek, endDay, endTimeDst])

  const saveDst = useCallback(async () => {
    if (!dstState.data) return
    setSavingDst(true)
    setDstMessage(null)

    const params: GenDstConfig = {
      ...dstState.data,
      Enable: Number.isNaN(parseInt(dstEnabled, 10)) ? (dstState.data.Enable ?? 0) : parseInt(dstEnabled, 10),
      OffsetTime: Number.isNaN(parseInt(dstOffsetTime, 10)) ? (dstState.data.OffsetTime ?? 0) : parseInt(dstOffsetTime, 10),
      Mode: Number.isNaN(parseInt(dstMode, 10)) ? (dstState.data.Mode ?? 0) : parseInt(dstMode, 10),
      StartTime: `${startMonth},${startWeek},${startDay},${startTimeDst}`,
      EndTime: `${endMonth},${endWeek},${endDay},${endTimeDst}`,
    }
    delete params.ParamType

    const result = await updateConfig(serial, "GenDst", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save DST settings"
      setDstMessage(errMsg)
      addNotification("N62 DST Save Failed", errMsg)
      setSavingDst(false)
      return
    }

    setDstMessage("DST settings updated")
    addNotification("N62 DST Saved", `DST settings saved successfully for ${serial}.`)
    setSavingDst(false)
    loadDst()
  }, [serial, dstState.data, dstEnabled, dstOffsetTime, dstMode, startMonth, startWeek, startDay, startTimeDst, endMonth, endWeek, endDay, endTimeDst, addNotification, loadDst])

  const hasUserChange = useMemo(() => {
    if (!userState.data) return false
    const enableChanged = String(userState.data.Enable ?? 0) !== userEnabled
    if (enableChanged) return true
    if (userEnabled !== "1") return false
    return String(userState.data[selectedUserKey]?.Password ?? "") !== selectedUserPassword
  }, [userState.data, userEnabled, selectedUserKey, selectedUserPassword])

  const saveUser = useCallback(async () => {
    if (!userState.data) return
    setSavingUser(true)
    setUserMessage(null)

    const params: GenUserConfig = {
      ...userState.data,
      Enable: parseInt(userEnabled, 10),
      User_00: {
        Name: userState.data.User_00?.Name ?? "Admin",
        Password: selectedUserKey === "User_00" ? selectedUserPassword : (userState.data.User_00?.Password ?? ""),
      },
      User_01: {
        Name: userState.data.User_01?.Name ?? "Guest",
        Password: selectedUserKey === "User_01" ? selectedUserPassword : (userState.data.User_01?.Password ?? ""),
      },
    }
    delete params.ParamType

    const result = await updateConfig(serial, "GenUser", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save user settings"
      setUserMessage(errMsg)
      addNotification("N62 User Save Failed", errMsg)
      setSavingUser(false)
      return
    }

    setUserMessage("User settings updated")
    addNotification("N62 User Saved", `User settings saved successfully for ${serial}.`)
    setSavingUser(false)
    loadUser()
  }, [serial, userState.data, userEnabled, selectedUserKey, selectedUserPassword, addNotification, loadUser])

  const hasDeviceInfoChange = useMemo(() => {
    if (!devInfoState.data) return false
    return String(devInfoState.data.DevName ?? "") !== devName
  }, [devInfoState.data, devName])

  const saveDeviceInfo = useCallback(async () => {
    if (!devInfoState.data) return
    setSavingDevInfo(true)
    setDevInfoMessage(null)

    const params: GenDevInfoConfig = {
      ...devInfoState.data,
      DevName: devName,
    }
    delete params.ParamType

    const result = await updateConfig(serial, "GenDevInfo", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save device info"
      setDevInfoMessage(errMsg)
      addNotification("N62 Device Info Save Failed", errMsg)
      setSavingDevInfo(false)
      return
    }

    setDevInfoMessage("Device info updated")
    addNotification("N62 Device Info Saved", `Device info saved successfully for ${serial}.`)
    setSavingDevInfo(false)
    loadDeviceInfo()
  }, [serial, devInfoState.data, devName, addNotification, loadDeviceInfo])

  const hasPowerChange = useMemo(() => {
    if (!powerState.data) return false
    const originalMode = String(powerState.data.Mode ?? 0)
    let modeSpecificChanged = originalMode !== powerMode

    if (powerMode === "0") {
      modeSpecificChanged = modeSpecificChanged || (String(powerState.data.DelayTime ?? 0) !== delayTime)
    }
    if (powerMode === "1") {
      const [originalStartTime = "06:00:00", originalEndTime = "23:00:00"] = String(powerState.data.RunTime ?? "").split(",")
      modeSpecificChanged = modeSpecificChanged || originalStartTime !== startTime || originalEndTime !== endTime
    }
    if (powerMode === "2") {
      modeSpecificChanged = modeSpecificChanged || (
        String(powerState.data.DelayTime ?? 0) !== delayTime ||
        String(powerState.data.WakeUpInteval ?? 0) !== wakeUpInterval
      )
    }
    const [origPwr12Enabled = "0", origPwr12Thr = "90"] = String(powerState.data.PwrProtect12 ?? "0,90").split(",")
    const [origPwr24Enabled = "0", origPwr24Thr = "220"] = String(powerState.data.PwrProtect24 ?? "0,220").split(",")
    const powerProtectChanged = (
      origPwr12Enabled !== pwr12Enabled ||
      origPwr12Thr !== pwr12Thr ||
      origPwr24Enabled !== pwr24Enabled ||
      origPwr24Thr !== pwr24Thr
    )
    return modeSpecificChanged || powerProtectChanged
  }, [powerState.data, powerMode, delayTime, wakeUpInterval, startTime, endTime, pwr12Enabled, pwr12Thr, pwr24Enabled, pwr24Thr])

  const hasSystemTimeChange = useMemo(() => {
    if (!sysTimeState.data) return false
    return (
      String(sysTimeState.data.DateTime ?? "") !== sysDateTime ||
      decodeTimezone(String(sysTimeState.data.Zone ?? "")) !== sysZone ||
      String(sysTimeState.data.GpsSync ?? 0) !== sysGpsSync ||
      String(sysTimeState.data.NtpSync ?? "0,0") !== `${sysNtpEnabled},${sysNtpServer}` ||
      String(sysTimeState.data.DateFormat ?? 0) !== sysDateFormat ||
      String(sysTimeState.data.TimeFormat ?? 0) !== sysTimeFormat
    )
  }, [sysTimeState.data, sysDateTime, sysZone, sysGpsSync, sysNtpEnabled, sysNtpServer, sysDateFormat, sysTimeFormat])

  const saveSystemTime = useCallback(async () => {
    if (!sysTimeState.data) return
    setSavingSysTime(true)
    setSysTimeMessage(null)

    const params: GenDateTimeConfig = {
      ...sysTimeState.data,
      DateTime: sysDateTime,
      Zone: encodeTimezone(sysZone),
      GpsSync: Number.isNaN(parseInt(sysGpsSync, 10)) ? (sysTimeState.data.GpsSync ?? 0) : parseInt(sysGpsSync, 10),
      NtpSync: `${sysNtpEnabled},${sysNtpServer}`,
      DateFormat: Number.isNaN(parseInt(sysDateFormat, 10)) ? (sysTimeState.data.DateFormat ?? 0) : parseInt(sysDateFormat, 10),
      TimeFormat: Number.isNaN(parseInt(sysTimeFormat, 10)) ? (sysTimeState.data.TimeFormat ?? 0) : parseInt(sysTimeFormat, 10),
    }
    delete params.ParamType

    const result = await updateConfig(serial, "GenDateTime", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save system time"
      setSysTimeMessage(errMsg)
      addNotification("N62 System Time Save Failed", errMsg)
      setSavingSysTime(false)
      return
    }

    setSysTimeMessage("System time updated")
    addNotification("N62 System Time Saved", `System time saved successfully for ${serial}.`)
    setSavingSysTime(false)
    loadSystemTime()
  }, [serial, sysTimeState.data, sysDateTime, sysZone, sysGpsSync, sysNtpEnabled, sysNtpServer, sysDateFormat, sysTimeFormat, addNotification, loadSystemTime])

  const savePower = useCallback(async () => {
    if (!powerState.data) return
    setSavingPower(true)
    setPowerMessage(null)
    const params: GenStartUpConfig = { ...powerState.data, Mode: Number(powerMode) }
    delete params.ParamType
    delete params.DelayTime
    delete params.WakeUpInteval
    delete params.RunTime

    if (powerMode === "0") {
      const parsedDelayTime = parseInt(delayTime, 10)
      params.DelayTime = Number.isNaN(parsedDelayTime) ? (powerState.data.DelayTime ?? 0) : parsedDelayTime
    } else if (powerMode === "1") {
      params.RunTime = `${startTime},${endTime}`
    } else if (powerMode === "2") {
      const parsedDelayTime = parseInt(delayTime, 10)
      params.DelayTime = Number.isNaN(parsedDelayTime) ? (powerState.data.DelayTime ?? 0) : parsedDelayTime
      const parsedWakeUp = parseInt(wakeUpInterval, 10)
      params.WakeUpInteval = Number.isNaN(parsedWakeUp) ? (powerState.data.WakeUpInteval ?? 0) : parsedWakeUp
    }
    const parsedPwr12Thr = parseInt(pwr12Thr, 10)
    const parsedPwr24Thr = parseInt(pwr24Thr, 10)
    params.PwrProtect12 = `${pwr12Enabled},${Number.isNaN(parsedPwr12Thr) ? 90 : parsedPwr12Thr}`
    params.PwrProtect24 = `${pwr24Enabled},${Number.isNaN(parsedPwr24Thr) ? 220 : parsedPwr24Thr}`

    const result = await updateConfig(serial, "GenStartUp", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save power mode"
      setPowerMessage(errMsg)
      addNotification("N62 Power Save Failed", errMsg)
      setSavingPower(false)
      return
    }

    setPowerMessage("Power mode updated")
    addNotification("N62 Power Saved", `Power mode saved successfully for ${serial}.`)
    setSavingPower(false)
    loadPower()
  }, [serial, powerMode, delayTime, wakeUpInterval, startTime, endTime, pwr12Enabled, pwr12Thr, pwr24Enabled, pwr24Thr, powerState.data, loadPower, addNotification])

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className="capitalize"
          >
            {tab}
          </Button>
        ))}
      </div>

      {activeTab !== "general" ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-600">
          {activeTab} configuration will be added next.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Device Info</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadDeviceInfo}
                  disabled={devInfoState.loading || savingDevInfo}
                >
                  {devInfoState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveDeviceInfo} disabled={!hasDeviceInfoChange || savingDevInfo || devInfoState.loading}>
                  {savingDevInfo ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save device info
                    </>
                  )}
                </Button>
              </div>
            </div>
            {devInfoState.error && <p className="text-sm text-red-600">{devInfoState.error}</p>}
            {devInfoMessage && <p className="text-sm text-gray-700">{devInfoMessage}</p>}
            {devInfoState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(devInfoState.loadedAt).toLocaleString()}</p>
            )}
            <div className="space-y-2">
              <label className="text-sm text-gray-700">Device Name</label>
              <Input value={devName} onChange={(e) => setDevName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border rounded p-3 text-sm">
                <div className="text-gray-500">Device ID</div>
                <div className="font-medium text-gray-900 break-all">{devInfoState.data?.DevId ?? "—"}</div>
              </div>
              <div className="border rounded p-3 text-sm">
                <div className="text-gray-500">AI Status</div>
                <div className="font-medium text-gray-900">{devInfoState.data?.AiStatus ?? "—"}</div>
              </div>
              <div className="border rounded p-3 text-sm">
                <div className="text-gray-500">Software Version</div>
                <div className="font-medium text-gray-900 break-all">{devInfoState.data?.SoftVer ?? "—"}</div>
              </div>
              <div className="border rounded p-3 text-sm">
                <div className="text-gray-500">MCU Version</div>
                <div className="font-medium text-gray-900 break-all">{devInfoState.data?.McuVer ?? "—"}</div>
              </div>
              <div className="border rounded p-3 text-sm">
                <div className="text-gray-500">Algorithm Version</div>
                <div className="font-medium text-gray-900 break-all">{devInfoState.data?.AlgVer ?? "—"}</div>
              </div>
              <div className="border rounded p-3 text-sm">
                <div className="text-gray-500">Resource Version</div>
                <div className="font-medium text-gray-900 break-all">{devInfoState.data?.ResVer ?? "—"}</div>
              </div>
              <div className="border rounded p-3 text-sm sm:col-span-2">
                <div className="text-gray-500">Chip ID</div>
                <div className="font-medium text-gray-900 break-all">{devInfoState.data?.ChipId ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">System Time</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSystemTime}
                  disabled={sysTimeState.loading || savingSysTime}
                >
                  {sysTimeState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveSystemTime} disabled={!hasSystemTimeChange || savingSysTime || sysTimeState.loading}>
                  {savingSysTime ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save system time
                    </>
                  )}
                </Button>
              </div>
            </div>

            {sysTimeState.error && <p className="text-sm text-red-600">{sysTimeState.error}</p>}
            {sysTimeMessage && <p className="text-sm text-gray-700">{sysTimeMessage}</p>}
            {sysTimeState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(sysTimeState.loadedAt).toLocaleString()}</p>
            )}

            <div className="space-y-2">
              <label className="text-sm text-gray-700">Date / Time</label>
              <Input value={sysDateTime} onChange={(e) => setSysDateTime(e.target.value)} placeholder="YYYY/MM/DD HH:MM:SS" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-700">Timezone</label>
              <Select value={sysZone} onValueChange={setSysZone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">GPS Time Sync</label>
                <Select value={sysGpsSync} onValueChange={setSysGpsSync}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Disabled</SelectItem>
                    <SelectItem value="1">Enabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Date Format</label>
                <Select value={sysDateFormat} onValueChange={setSysDateFormat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">DD/MM/YYYY</SelectItem>
                    <SelectItem value="1">YYYY/MM/DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Time Format</label>
                <Select value={sysTimeFormat} onValueChange={setSysTimeFormat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">24-hour</SelectItem>
                    <SelectItem value="1">12-hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-700">NTP Sync</label>
              <Select value={sysNtpEnabled} onValueChange={setSysNtpEnabled}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Disabled</SelectItem>
                  <SelectItem value="1">Enabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-700">NTP Server</label>
              <Select value={sysNtpServer} onValueChange={setSysNtpServer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">time.windows.com</SelectItem>
                  <SelectItem value="1">pool.ntp.org</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">DSTSet</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadDst}
                  disabled={dstState.loading || savingDst}
                >
                  {dstState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveDst} disabled={!hasDstChange || savingDst || dstState.loading}>
                  {savingDst ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save dst
                    </>
                  )}
                </Button>
              </div>
            </div>

            {dstState.error && <p className="text-sm text-red-600">{dstState.error}</p>}
            {dstMessage && <p className="text-sm text-gray-700">{dstMessage}</p>}
            {dstState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(dstState.loadedAt).toLocaleString()}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Enable</label>
                <Select value={dstEnabled} onValueChange={setDstEnabled}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Disabled</SelectItem>
                    <SelectItem value="1">Enabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Offset</label>
                <Select value={dstOffsetTime} onValueChange={setDstOffsetTime}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">1Hour</SelectItem>
                    <SelectItem value="1">2Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Mode</label>
                <Select value={dstMode} onValueChange={setDstMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Day</SelectItem>
                    <SelectItem value="1">Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border rounded p-3 space-y-3">
                <div className="text-sm font-medium text-gray-900">Start</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-700">SMonth</label>
                    <Input value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-700">SWeek</label>
                    <Input value={startWeek} onChange={(e) => setStartWeek(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-700">SDay</label>
                    <Input value={startDay} onChange={(e) => setStartDay(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-700">STime</label>
                    <Input value={startTimeDst} onChange={(e) => setStartTimeDst(e.target.value)} placeholder="HH:MM:SS" />
                  </div>
                </div>
              </div>

              <div className="border rounded p-3 space-y-3">
                <div className="text-sm font-medium text-gray-900">End</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-700">EMonth</label>
                    <Input value={endMonth} onChange={(e) => setEndMonth(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-700">EWeek</label>
                    <Input value={endWeek} onChange={(e) => setEndWeek(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-700">EDay</label>
                    <Input value={endDay} onChange={(e) => setEndDay(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-700">ETime</label>
                    <Input value={endTimeDst} onChange={(e) => setEndTimeDst(e.target.value)} placeholder="HH:MM:SS" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">User</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadUser}
                  disabled={userState.loading || savingUser}
                >
                  {userState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveUser} disabled={!hasUserChange || savingUser || userState.loading}>
                  {savingUser ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save user
                    </>
                  )}
                </Button>
              </div>
            </div>
            {userState.error && <p className="text-sm text-red-600">{userState.error}</p>}
            {userMessage && <p className="text-sm text-gray-700">{userMessage}</p>}
            {userState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(userState.loadedAt).toLocaleString()}</p>
            )}

            <div className="space-y-2">
              <label className="text-sm text-gray-700">App User</label>
              <Select value={userEnabled} onValueChange={setUserEnabled}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Disabled</SelectItem>
                  <SelectItem value="1">Enabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userEnabled === "1" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">User</label>
                  <Select
                    value={selectedUserKey}
                    onValueChange={(value) => {
                      const nextKey = value as "User_00" | "User_01"
                      setSelectedUserKey(nextKey)
                      setSelectedUserPassword(String(userState.data?.[nextKey]?.Password ?? ""))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="User_00">{userState.data?.User_00?.Name ?? "Admin"}</SelectItem>
                      <SelectItem value="User_01">{userState.data?.User_01?.Name ?? "Guest"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Password</label>
                  <Input
                    value={selectedUserPassword}
                    onChange={(e) => setSelectedUserPassword(e.target.value)}
                    type="text"
                  />
                </div>
              </>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-600" />
                Power
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadPower} disabled={powerState.loading || savingPower}>
                  {powerState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={savePower} disabled={!hasPowerChange || savingPower || powerState.loading}>
                  {savingPower ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save power
                    </>
                  )}
                </Button>
              </div>
            </div>

            {powerState.error && <p className="text-sm text-red-600">{powerState.error}</p>}
            {powerMessage && <p className="text-sm text-gray-700">{powerMessage}</p>}
            {powerState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(powerState.loadedAt).toLocaleString()}</p>
            )}

            <div className="max-w-md space-y-2">
              <label className="text-sm text-gray-700">Power Mode</label>
              <Select value={powerMode} onValueChange={setPowerMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select power mode" />
                </SelectTrigger>
                <SelectContent>
                  {POWER_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {powerMode === "0" && (
              <div className="max-w-md space-y-2">
                <label className="text-sm text-gray-700">DelayOff (min)</label>
                <Input
                  type="number"
                  value={delayTime}
                  onChange={(e) => setDelayTime(e.target.value)}
                />
              </div>
            )}

            {powerMode === "1" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">STime</label>
                  <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">ETime</label>
                  <Input value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
            )}

            {powerMode === "2" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">DelayOff (min)</label>
                  <Input
                    type="number"
                    value={delayTime}
                    onChange={(e) => setDelayTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">WakeUp (min)</label>
                  <Input
                    type="number"
                    value={wakeUpInterval}
                    onChange={(e) => setWakeUpInterval(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="border rounded p-3 space-y-3">
                <div className="text-sm font-medium text-gray-900">12V PWR Protect</div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-700">12VPwrProtect</label>
                  <Select value={pwr12Enabled} onValueChange={setPwr12Enabled}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Disabled</SelectItem>
                      <SelectItem value="1">Enabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-700">12V_Thr (0.1V)</label>
                  <Input
                    type="number"
                    value={pwr12Thr}
                    onChange={(e) => setPwr12Thr(e.target.value)}
                  />
                </div>
              </div>

              <div className="border rounded p-3 space-y-3">
                <div className="text-sm font-medium text-gray-900">24V PWR Protect</div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-700">24VPwrProtect</label>
                  <Select value={pwr24Enabled} onValueChange={setPwr24Enabled}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Disabled</SelectItem>
                      <SelectItem value="1">Enabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-700">24V_Thr (0.1V)</label>
                  <Input
                    type="number"
                    value={pwr24Thr}
                    onChange={(e) => setPwr24Thr(e.target.value)}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
