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

interface VehBaseInfoConfig {
  CarPlate?: string
  DriverName?: string
  DriverLic?: string
  PhoneNum?: string
  Company?: string
  AssemblyDate?: string
  ShortName?: number
  ParamType?: string
  [key: string]: unknown
}

interface VehPositionConfig {
  GpsMode?: number
  GpsUpInterval?: number
  GpsBatchNum?: number
  SpdFilter?: number
  SpdCorrV?: number
  ParamType?: string
  [key: string]: unknown
}

interface VehMileageConfig {
  BaseV?: number
  ParamType?: string
  [key: string]: unknown
}

interface PreviewConfig {
  OutVolume?: number
  Split?: number
  ParamType?: string
  [key: string]: unknown
}

interface RecAttrConfig {
  Duration?: number
  Encrypt?: string
  FileFormat?: number
  Mode?: number
  PreDuration?: number
  SaveDays?: number
  StreamType?: number
  VencFormat?: number
  ParamType?: string
  [key: string]: unknown
}

interface RecStreamChannelConfig {
  AudioEn?: number
  Enable?: number
  FrmRate?: number
  Qp?: number
  Res?: number
}

interface RecStreamConfig {
  ChnNum?: number
  Chn_00?: RecStreamChannelConfig
  Chn_01?: RecStreamChannelConfig
  Chn_02?: RecStreamChannelConfig
  Chn_03?: RecStreamChannelConfig
  ParamType?: string
  [key: string]: unknown
}

interface ReCamChannelConfig {
  Direction?: number
  Enable?: number
  FrmRate?: number
  Mode?: number
  Res?: number
  Type?: number
}

interface ReCamAttrConfig {
  ChnNum?: number
  Chn_00?: ReCamChannelConfig
  Chn_01?: ReCamChannelConfig
  Chn_02?: ReCamChannelConfig
  Chn_03?: ReCamChannelConfig
  ParamType?: string
  [key: string]: unknown
}

interface ReCapAttrConfig {
  CapRes?: number
  ChnMask?: number
  ChnNum?: number
  Enable?: number
  Inteval?: number
  Inteval_P?: number
  SaveDays?: number
  ParamType?: string
  [key: string]: unknown
}

interface AlmIoChannelConfig {
  En?: number
  LnkParam?: string
  Thr?: number
  Type?: number
}

interface AlmIoInConfig {
  ChnNum?: number
  Chn_00?: AlmIoChannelConfig
  Chn_01?: AlmIoChannelConfig
  Chn_02?: AlmIoChannelConfig
  Chn_03?: AlmIoChannelConfig
  ParamType?: string
  [key: string]: unknown
}

interface AlarmRuleConfig {
  Duration?: number
  En?: boolean | number
  LnkParam?: string
  Thr?: number
}

interface AlmSpdConfig {
  ChnNum?: number
  MaxSpd?: AlarmRuleConfig
  MinSpd?: AlarmRuleConfig
  Parking?: AlarmRuleConfig
  ParamType?: string
  [key: string]: unknown
}

interface AlmGsnConfig {
  ChnNum?: number
  Collision?: AlarmRuleConfig
  Incline?: AlarmRuleConfig
  Install?: number
  Mode?: number
  SlwDown?: AlarmRuleConfig
  SpdUp?: AlarmRuleConfig
  Turn?: AlarmRuleConfig
  ParamType?: string
  [key: string]: unknown
}

interface DrivingConfig {
  ChnNum?: number
  MinRest?: number
  PreTimeOut?: AlarmRuleConfig
  PreTired?: AlarmRuleConfig
  TimeOut?: AlarmRuleConfig
  Tired?: AlarmRuleConfig
  ParamType?: string
  [key: string]: unknown
}

interface NetWiredConfig {
  DNS1?: string
  DNS2?: string
  DhcpEn?: number
  Enable?: number
  Gateway?: string
  IP?: string
  SubMask?: string
  ParamType?: string
  [key: string]: unknown
}

interface NetWifiConfig {
  DhcpEn?: number
  Enable?: number
  EncryptType?: number
  Mode?: number
  Pwd?: string
  SSID?: string
  ParamType?: string
  [key: string]: unknown
}

interface NetXgConfig {
  APN?: string
  AbRestartEn?: number
  AuthType?: number
  CenterNum?: string
  Enable?: number
  Mode?: number
  Pwd?: string
  RedialInter?: number
  User?: string
  ParamType?: string
  [key: string]: unknown
}

interface NetCmsServerConfig {
  Enable?: number
  Protocol?: number
  ServersAddr?: string
  VisitType?: number
}

interface NetCmsConfig {
  ChnNum?: number
  Server_00?: NetCmsServerConfig
  Server_01?: NetCmsServerConfig
  ParamType?: string
  [key: string]: unknown
}

interface NetFtpConfig {
  Enable?: number
  ServersAddr?: string
  User?: string
  Pwd?: string
  VisitType?: number
  ParamType?: string
  [key: string]: unknown
}

interface PerUartChannelConfig {
  BaudRate?: number
  DataBit?: number
  DevType?: number
  Enable?: number
  IntfType?: number
  StopBit?: number
  Verify?: number
}

interface PerUartConfig {
  Uart_00?: PerUartChannelConfig
  Uart_01?: PerUartChannelConfig
  Uart_02?: PerUartChannelConfig
  Uart_03?: PerUartChannelConfig
  ParamType?: string
  [key: string]: unknown
}

interface PerIoOutputConfig {
  IoOut_1?: number
  ParamType?: string
  [key: string]: unknown
}

const TABS = ["general", "vehicle", "preview", "record", "alarm", "network", "peripheral", "ai"] as const
const POWER_MODE_OPTIONS = [
  { value: "0", label: "ACC" },
  { value: "1", label: "Timer" },
  { value: "2", label: "Sleep" },
]
const VEHICLE_POSITION_MODE_OPTIONS = [
  { value: "3", label: "GPS+BD" },
  { value: "5", label: "GPS+GLONASS" },
]
const RECORD_CHANNEL_KEYS = ["Chn_00", "Chn_01", "Chn_02", "Chn_03"] as const
const SPEED_ALARM_KEYS = ["MaxSpd", "MinSpd", "Parking"] as const
const G_SENSOR_ALARM_KEYS = ["Collision", "Incline", "SlwDown", "SpdUp", "Turn"] as const
const DRIVING_ALARM_KEYS = ["PreTimeOut", "PreTired", "TimeOut", "Tired"] as const
const UART_KEYS = ["Uart_00", "Uart_01", "Uart_02", "Uart_03"] as const

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
  const [vehicleInfoState, setVehicleInfoState] = useState<DataState<VehBaseInfoConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [plateNumber, setPlateNumber] = useState<string>("")
  const [driverName, setDriverName] = useState<string>("")
  const [driverLicense, setDriverLicense] = useState<string>("")
  const [phoneNumber, setPhoneNumber] = useState<string>("")
  const [company, setCompany] = useState<string>("")
  const [installDate, setInstallDate] = useState<string>("")
  const [savingVehicleInfo, setSavingVehicleInfo] = useState(false)
  const [vehicleInfoMessage, setVehicleInfoMessage] = useState<string | null>(null)
  const [vehiclePositionState, setVehiclePositionState] = useState<DataState<VehPositionConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [gpsMode, setGpsMode] = useState<string>("3")
  const [gpsInterval, setGpsInterval] = useState<string>("30")
  const [gpsBatchUpload, setGpsBatchUpload] = useState<string>("1")
  const [speedFilter, setSpeedFilter] = useState<string>("5")
  const [speedCorrection, setSpeedCorrection] = useState<string>("6")
  const [savingVehiclePosition, setSavingVehiclePosition] = useState(false)
  const [vehiclePositionMessage, setVehiclePositionMessage] = useState<string | null>(null)
  const [vehicleMileageState, setVehicleMileageState] = useState<DataState<VehMileageConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [baseMileageValue, setBaseMileageValue] = useState<string>("0")
  const [savingVehicleMileage, setSavingVehicleMileage] = useState(false)
  const [vehicleMileageMessage, setVehicleMileageMessage] = useState<string | null>(null)
  const [previewState, setPreviewState] = useState<DataState<PreviewConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [previewVolume, setPreviewVolume] = useState<string>("80")
  const [previewSplit, setPreviewSplit] = useState<string>("1")
  const [savingPreview, setSavingPreview] = useState(false)
  const [previewMessage, setPreviewMessage] = useState<string | null>(null)
  const [recAttrState, setRecAttrState] = useState<DataState<RecAttrConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [recMode, setRecMode] = useState<string>("0")
  const [recDuration, setRecDuration] = useState<string>("10")
  const [recPreDuration, setRecPreDuration] = useState<string>("5")
  const [recSaveDays, setRecSaveDays] = useState<string>("7")
  const [recStreamType, setRecStreamType] = useState<string>("0")
  const [recFileFormat, setRecFileFormat] = useState<string>("0")
  const [recVencFormat, setRecVencFormat] = useState<string>("1")
  const [savingRecAttr, setSavingRecAttr] = useState(false)
  const [recAttrMessage, setRecAttrMessage] = useState<string | null>(null)
  const [recStreamMainState, setRecStreamMainState] = useState<DataState<RecStreamConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [recStreamMainChannels, setRecStreamMainChannels] = useState(
    RECORD_CHANNEL_KEYS.map(() => ({ Enable: "0", AudioEn: "0", FrmRate: "15", Qp: "1", Res: "0" }))
  )
  const [savingRecStreamMain, setSavingRecStreamMain] = useState(false)
  const [recStreamMainMessage, setRecStreamMainMessage] = useState<string | null>(null)
  const [recStreamSubState, setRecStreamSubState] = useState<DataState<RecStreamConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [recStreamSubChannels, setRecStreamSubChannels] = useState(
    RECORD_CHANNEL_KEYS.map(() => ({ Enable: "0", AudioEn: "0", FrmRate: "15", Qp: "1", Res: "0" }))
  )
  const [savingRecStreamSub, setSavingRecStreamSub] = useState(false)
  const [recStreamSubMessage, setRecStreamSubMessage] = useState<string | null>(null)
  const [reCamAttrState, setReCamAttrState] = useState<DataState<ReCamAttrConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [reCamChannels, setReCamChannels] = useState(
    RECORD_CHANNEL_KEYS.map(() => ({ Enable: "0", Direction: "0", FrmRate: "0", Mode: "0", Res: "0", Type: "0" }))
  )
  const [savingReCamAttr, setSavingReCamAttr] = useState(false)
  const [reCamAttrMessage, setReCamAttrMessage] = useState<string | null>(null)
  const [reCapAttrState, setReCapAttrState] = useState<DataState<ReCapAttrConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [reCapEnable, setReCapEnable] = useState<string>("0")
  const [reCapRes, setReCapRes] = useState<string>("0")
  const [reCapChnMask, setReCapChnMask] = useState<string>("0")
  const [reCapInterval, setReCapInterval] = useState<string>("300")
  const [reCapParkingInterval, setReCapParkingInterval] = useState<string>("300")
  const [reCapSaveDays, setReCapSaveDays] = useState<string>("30")
  const [savingReCapAttr, setSavingReCapAttr] = useState(false)
  const [reCapAttrMessage, setReCapAttrMessage] = useState<string | null>(null)
  const [almIoInState, setAlmIoInState] = useState<DataState<AlmIoInConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [almIoChannels, setAlmIoChannels] = useState(
    RECORD_CHANNEL_KEYS.map(() => ({ En: "0", Type: "0", Thr: "0", LnkParam: "" }))
  )
  const [savingAlmIoIn, setSavingAlmIoIn] = useState(false)
  const [almIoInMessage, setAlmIoInMessage] = useState<string | null>(null)
  const [almSpdState, setAlmSpdState] = useState<DataState<AlmSpdConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [almSpdRules, setAlmSpdRules] = useState<Record<(typeof SPEED_ALARM_KEYS)[number], { En: string; Duration: string; Thr: string; LnkParam: string }>>({
    MaxSpd: { En: "0", Duration: "0", Thr: "0", LnkParam: "" },
    MinSpd: { En: "0", Duration: "0", Thr: "0", LnkParam: "" },
    Parking: { En: "0", Duration: "0", Thr: "0", LnkParam: "" },
  })
  const [savingAlmSpd, setSavingAlmSpd] = useState(false)
  const [almSpdMessage, setAlmSpdMessage] = useState<string | null>(null)
  const [almGsnState, setAlmGsnState] = useState<DataState<AlmGsnConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [almGsnInstall, setAlmGsnInstall] = useState<string>("0")
  const [almGsnMode, setAlmGsnMode] = useState<string>("0")
  const [almGsnRules, setAlmGsnRules] = useState<Record<(typeof G_SENSOR_ALARM_KEYS)[number], { En: string; Thr: string; LnkParam: string }>>({
    Collision: { En: "0", Thr: "0", LnkParam: "" },
    Incline: { En: "0", Thr: "0", LnkParam: "" },
    SlwDown: { En: "0", Thr: "0", LnkParam: "" },
    SpdUp: { En: "0", Thr: "0", LnkParam: "" },
    Turn: { En: "0", Thr: "0", LnkParam: "" },
  })
  const [savingAlmGsn, setSavingAlmGsn] = useState(false)
  const [almGsnMessage, setAlmGsnMessage] = useState<string | null>(null)
  const [drivingState, setDrivingState] = useState<DataState<DrivingConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [drivingMinRest, setDrivingMinRest] = useState<string>("15")
  const [drivingRules, setDrivingRules] = useState<Record<(typeof DRIVING_ALARM_KEYS)[number], { En: string; Thr: string; LnkParam: string }>>({
    PreTimeOut: { En: "0", Thr: "0", LnkParam: "" },
    PreTired: { En: "0", Thr: "0", LnkParam: "" },
    TimeOut: { En: "0", Thr: "0", LnkParam: "" },
    Tired: { En: "0", Thr: "0", LnkParam: "" },
  })
  const [savingDriving, setSavingDriving] = useState(false)
  const [drivingMessage, setDrivingMessage] = useState<string | null>(null)
  const [netWiredState, setNetWiredState] = useState<DataState<NetWiredConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [netWiredEnable, setNetWiredEnable] = useState<string>("0")
  const [netWiredDhcp, setNetWiredDhcp] = useState<string>("0")
  const [netWiredIp, setNetWiredIp] = useState<string>("")
  const [netWiredMask, setNetWiredMask] = useState<string>("")
  const [netWiredGateway, setNetWiredGateway] = useState<string>("")
  const [netWiredDns1, setNetWiredDns1] = useState<string>("")
  const [netWiredDns2, setNetWiredDns2] = useState<string>("")
  const [savingNetWired, setSavingNetWired] = useState(false)
  const [netWiredMessage, setNetWiredMessage] = useState<string | null>(null)
  const [netWifiState, setNetWifiState] = useState<DataState<NetWifiConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [netWifiEnable, setNetWifiEnable] = useState<string>("0")
  const [netWifiSsid, setNetWifiSsid] = useState<string>("")
  const [netWifiMode, setNetWifiMode] = useState<string>("0")
  const [netWifiEncryptType, setNetWifiEncryptType] = useState<string>("0")
  const [netWifiDhcp, setNetWifiDhcp] = useState<string>("0")
  const [netWifiPassword, setNetWifiPassword] = useState<string>("")
  const [savingNetWifi, setSavingNetWifi] = useState(false)
  const [netWifiMessage, setNetWifiMessage] = useState<string | null>(null)
  const [net4gState, setNet4gState] = useState<DataState<NetXgConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [net4gEnable, setNet4gEnable] = useState<string>("0")
  const [net4gApn, setNet4gApn] = useState<string>("")
  const [net4gMode, setNet4gMode] = useState<string>("0")
  const [net4gAuthType, setNet4gAuthType] = useState<string>("0")
  const [net4gCenterNum, setNet4gCenterNum] = useState<string>("")
  const [net4gRedialInter, setNet4gRedialInter] = useState<string>("10")
  const [net4gAbRestartEn, setNet4gAbRestartEn] = useState<string>("0")
  const [net4gUser, setNet4gUser] = useState<string>("")
  const [net4gPassword, setNet4gPassword] = useState<string>("")
  const [savingNet4g, setSavingNet4g] = useState(false)
  const [net4gMessage, setNet4gMessage] = useState<string | null>(null)
  const [netCmsState, setNetCmsState] = useState<DataState<NetCmsConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [netCmsServers, setNetCmsServers] = useState<Array<{ Enable: string; ServersAddr: string; Protocol: string; VisitType: string }>>([])
  const [savingNetCms, setSavingNetCms] = useState(false)
  const [netCmsMessage, setNetCmsMessage] = useState<string | null>(null)
  const [netFtpState, setNetFtpState] = useState<DataState<NetFtpConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [netFtpEnable, setNetFtpEnable] = useState<string>("0")
  const [netFtpServerAddr, setNetFtpServerAddr] = useState<string>("")
  const [netFtpUser, setNetFtpUser] = useState<string>("")
  const [netFtpPassword, setNetFtpPassword] = useState<string>("")
  const [netFtpVisitType, setNetFtpVisitType] = useState<string>("0")
  const [savingNetFtp, setSavingNetFtp] = useState(false)
  const [netFtpMessage, setNetFtpMessage] = useState<string | null>(null)
  const [perUartState, setPerUartState] = useState<DataState<PerUartConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [perUartChannels, setPerUartChannels] = useState(
    UART_KEYS.map(() => ({ Enable: "0", IntfType: "0", DevType: "0", BaudRate: "3", DataBit: "0", StopBit: "0", Verify: "0" }))
  )
  const [savingPerUart, setSavingPerUart] = useState(false)
  const [perUartMessage, setPerUartMessage] = useState<string | null>(null)
  const [perIoOutputState, setPerIoOutputState] = useState<DataState<PerIoOutputConfig>>({
    data: null,
    loading: false,
    error: null,
    loadedAt: null,
  })
  const [ioOut1, setIoOut1] = useState<string>("0")
  const [savingPerIoOutput, setSavingPerIoOutput] = useState(false)
  const [perIoOutputMessage, setPerIoOutputMessage] = useState<string | null>(null)

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

  const loadVehicleInfo = useCallback(() => {
    setVehicleInfoState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "VehBaseInfo" } }).then((result) => {
      const data = (result.data ?? null) as VehBaseInfoConfig | null
      setVehicleInfoState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setPlateNumber(String(data?.CarPlate ?? ""))
      setDriverName(String(data?.DriverName ?? ""))
      setDriverLicense(String(data?.DriverLic ?? ""))
      setPhoneNumber(String(data?.PhoneNum ?? ""))
      setCompany(String(data?.Company ?? ""))
      setInstallDate(String(data?.AssemblyDate ?? ""))
    })
  }, [serial])

  const loadVehiclePosition = useCallback(() => {
    setVehiclePositionState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "VehPosition" } }).then((result) => {
      const data = (result.data ?? null) as VehPositionConfig | null
      setVehiclePositionState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setGpsMode(String(data?.GpsMode ?? 3))
      setGpsInterval(String(data?.GpsUpInterval ?? 30))
      setGpsBatchUpload(String(data?.GpsBatchNum ?? 1))
      setSpeedFilter(String(data?.SpdFilter ?? 5))
      setSpeedCorrection(String(data?.SpdCorrV ?? 6))
    })
  }, [serial])

  const loadVehicleMileage = useCallback(() => {
    setVehicleMileageState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "VehMileage" } }).then((result) => {
      const data = (result.data ?? null) as VehMileageConfig | null
      setVehicleMileageState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setBaseMileageValue(String(data?.BaseV ?? 0))
    })
  }, [serial])

  const loadPreview = useCallback(() => {
    setPreviewState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "Preview" } }).then((result) => {
      const data = (result.data ?? null) as PreviewConfig | null
      setPreviewState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setPreviewVolume(String(data?.OutVolume ?? 80))
      setPreviewSplit(String(data?.Split ?? 1))
    })
  }, [serial])

  const loadRecAttr = useCallback(() => {
    setRecAttrState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "RecAttr" } }).then((result) => {
      const data = (result.data ?? null) as RecAttrConfig | null
      setRecAttrState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setRecMode(String(data?.Mode ?? 0))
      setRecDuration(String(data?.Duration ?? 10))
      setRecPreDuration(String(data?.PreDuration ?? 5))
      setRecSaveDays(String(data?.SaveDays ?? 7))
      setRecStreamType(String(data?.StreamType ?? 0))
      setRecFileFormat(String(data?.FileFormat ?? 0))
      setRecVencFormat(String(data?.VencFormat ?? 1))
    })
  }, [serial])

  const loadRecStreamMain = useCallback(() => {
    setRecStreamMainState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "RecStream_M" } }).then((result) => {
      const data = (result.data ?? null) as RecStreamConfig | null
      setRecStreamMainState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setRecStreamMainChannels(
        RECORD_CHANNEL_KEYS.map((key) => {
          const channel = data?.[key] as RecStreamChannelConfig | undefined
          return {
            Enable: String(channel?.Enable ?? 0),
            AudioEn: String(channel?.AudioEn ?? 0),
            FrmRate: String(channel?.FrmRate ?? 15),
            Qp: String(channel?.Qp ?? 1),
            Res: String(channel?.Res ?? 0),
          }
        })
      )
    })
  }, [serial])

  const loadRecStreamSub = useCallback(() => {
    setRecStreamSubState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "RecStream_S" } }).then((result) => {
      const data = (result.data ?? null) as RecStreamConfig | null
      setRecStreamSubState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setRecStreamSubChannels(
        RECORD_CHANNEL_KEYS.map((key) => {
          const channel = data?.[key] as RecStreamChannelConfig | undefined
          return {
            Enable: String(channel?.Enable ?? 0),
            AudioEn: String(channel?.AudioEn ?? 0),
            FrmRate: String(channel?.FrmRate ?? 15),
            Qp: String(channel?.Qp ?? 1),
            Res: String(channel?.Res ?? 0),
          }
        })
      )
    })
  }, [serial])

  const loadReCamAttr = useCallback(() => {
    setReCamAttrState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "ReCamAttr" } }).then((result) => {
      const data = (result.data ?? null) as ReCamAttrConfig | null
      setReCamAttrState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setReCamChannels(
        RECORD_CHANNEL_KEYS.map((key) => {
          const channel = data?.[key] as ReCamChannelConfig | undefined
          return {
            Enable: String(channel?.Enable ?? 0),
            Direction: String(channel?.Direction ?? 0),
            FrmRate: String(channel?.FrmRate ?? 0),
            Mode: String(channel?.Mode ?? 0),
            Res: String(channel?.Res ?? 0),
            Type: String(channel?.Type ?? 0),
          }
        })
      )
    })
  }, [serial])

  const loadReCapAttr = useCallback(() => {
    setReCapAttrState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "ReCapAttr" } }).then((result) => {
      const data = (result.data ?? null) as ReCapAttrConfig | null
      setReCapAttrState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setReCapEnable(String(data?.Enable ?? 0))
      setReCapRes(String(data?.CapRes ?? 0))
      setReCapChnMask(String(data?.ChnMask ?? 0))
      setReCapInterval(String(data?.Inteval ?? 300))
      setReCapParkingInterval(String(data?.Inteval_P ?? 300))
      setReCapSaveDays(String(data?.SaveDays ?? 30))
    })
  }, [serial])

  const loadAlmIoIn = useCallback(() => {
    setAlmIoInState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "AlmIoIn" } }).then((result) => {
      const data = (result.data ?? null) as AlmIoInConfig | null
      setAlmIoInState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setAlmIoChannels(
        RECORD_CHANNEL_KEYS.map((key) => {
          const channel = data?.[key] as AlmIoChannelConfig | undefined
          return {
            En: String(channel?.En ?? 0),
            Type: String(channel?.Type ?? 0),
            Thr: String(channel?.Thr ?? 0),
            LnkParam: String(channel?.LnkParam ?? ""),
          }
        })
      )
    })
  }, [serial])

  const loadAlmSpd = useCallback(() => {
    setAlmSpdState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "AlmSpd" } }).then((result) => {
      const data = (result.data ?? null) as AlmSpdConfig | null
      setAlmSpdState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setAlmSpdRules({
        MaxSpd: {
          En: String(typeof data?.MaxSpd?.En === "boolean" ? Number(data.MaxSpd.En) : (data?.MaxSpd?.En ?? 0)),
          Duration: String(data?.MaxSpd?.Duration ?? 0),
          Thr: String(data?.MaxSpd?.Thr ?? 0),
          LnkParam: String(data?.MaxSpd?.LnkParam ?? ""),
        },
        MinSpd: {
          En: String(typeof data?.MinSpd?.En === "boolean" ? Number(data.MinSpd.En) : (data?.MinSpd?.En ?? 0)),
          Duration: String(data?.MinSpd?.Duration ?? 0),
          Thr: String(data?.MinSpd?.Thr ?? 0),
          LnkParam: String(data?.MinSpd?.LnkParam ?? ""),
        },
        Parking: {
          En: String(typeof data?.Parking?.En === "boolean" ? Number(data.Parking.En) : (data?.Parking?.En ?? 0)),
          Duration: String(data?.Parking?.Duration ?? 0),
          Thr: String(data?.Parking?.Thr ?? 0),
          LnkParam: String(data?.Parking?.LnkParam ?? ""),
        },
      })
    })
  }, [serial])

  const loadAlmGsn = useCallback(() => {
    setAlmGsnState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "AlmGsn" } }).then((result) => {
      const data = (result.data ?? null) as AlmGsnConfig | null
      setAlmGsnState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setAlmGsnInstall(String(data?.Install ?? 0))
      setAlmGsnMode(String(data?.Mode ?? 0))
      setAlmGsnRules({
        Collision: {
          En: String(typeof data?.Collision?.En === "boolean" ? Number(data.Collision.En) : (data?.Collision?.En ?? 0)),
          Thr: String(data?.Collision?.Thr ?? 0),
          LnkParam: String(data?.Collision?.LnkParam ?? ""),
        },
        Incline: {
          En: String(typeof data?.Incline?.En === "boolean" ? Number(data.Incline.En) : (data?.Incline?.En ?? 0)),
          Thr: String(data?.Incline?.Thr ?? 0),
          LnkParam: String(data?.Incline?.LnkParam ?? ""),
        },
        SlwDown: {
          En: String(typeof data?.SlwDown?.En === "boolean" ? Number(data.SlwDown.En) : (data?.SlwDown?.En ?? 0)),
          Thr: String(data?.SlwDown?.Thr ?? 0),
          LnkParam: String(data?.SlwDown?.LnkParam ?? ""),
        },
        SpdUp: {
          En: String(typeof data?.SpdUp?.En === "boolean" ? Number(data.SpdUp.En) : (data?.SpdUp?.En ?? 0)),
          Thr: String(data?.SpdUp?.Thr ?? 0),
          LnkParam: String(data?.SpdUp?.LnkParam ?? ""),
        },
        Turn: {
          En: String(typeof data?.Turn?.En === "boolean" ? Number(data.Turn.En) : (data?.Turn?.En ?? 0)),
          Thr: String(data?.Turn?.Thr ?? 0),
          LnkParam: String(data?.Turn?.LnkParam ?? ""),
        },
      })
    })
  }, [serial])

  const loadDriving = useCallback(() => {
    setDrivingState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "Driving" } }).then((result) => {
      const data = (result.data ?? null) as DrivingConfig | null
      setDrivingState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setDrivingMinRest(String(data?.MinRest ?? 15))
      setDrivingRules({
        PreTimeOut: {
          En: String(typeof data?.PreTimeOut?.En === "boolean" ? Number(data.PreTimeOut.En) : (data?.PreTimeOut?.En ?? 0)),
          Thr: String(data?.PreTimeOut?.Thr ?? 0),
          LnkParam: String(data?.PreTimeOut?.LnkParam ?? ""),
        },
        PreTired: {
          En: String(typeof data?.PreTired?.En === "boolean" ? Number(data.PreTired.En) : (data?.PreTired?.En ?? 0)),
          Thr: String(data?.PreTired?.Thr ?? 0),
          LnkParam: String(data?.PreTired?.LnkParam ?? ""),
        },
        TimeOut: {
          En: String(typeof data?.TimeOut?.En === "boolean" ? Number(data.TimeOut.En) : (data?.TimeOut?.En ?? 0)),
          Thr: String(data?.TimeOut?.Thr ?? 0),
          LnkParam: String(data?.TimeOut?.LnkParam ?? ""),
        },
        Tired: {
          En: String(typeof data?.Tired?.En === "boolean" ? Number(data.Tired.En) : (data?.Tired?.En ?? 0)),
          Thr: String(data?.Tired?.Thr ?? 0),
          LnkParam: String(data?.Tired?.LnkParam ?? ""),
        },
      })
    })
  }, [serial])

  const loadNetWired = useCallback(() => {
    setNetWiredState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "NetWired" } }).then((result) => {
      const data = (result.data ?? null) as NetWiredConfig | null
      setNetWiredState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setNetWiredEnable(String(data?.Enable ?? 0))
      setNetWiredDhcp(String(data?.DhcpEn ?? 0))
      setNetWiredIp(String(data?.IP ?? ""))
      setNetWiredMask(String(data?.SubMask ?? ""))
      setNetWiredGateway(String(data?.Gateway ?? ""))
      setNetWiredDns1(String(data?.DNS1 ?? ""))
      setNetWiredDns2(String(data?.DNS2 ?? ""))
    })
  }, [serial])

  const loadNetWifi = useCallback(() => {
    setNetWifiState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "NetWifi" } }).then((result) => {
      const data = (result.data ?? null) as NetWifiConfig | null
      setNetWifiState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setNetWifiEnable(String(data?.Enable ?? 0))
      setNetWifiSsid(String(data?.SSID ?? ""))
      setNetWifiMode(String(data?.Mode ?? 0))
      setNetWifiEncryptType(String(data?.EncryptType ?? 0))
      setNetWifiDhcp(String(data?.DhcpEn ?? 0))
      setNetWifiPassword(String(data?.Pwd ?? ""))
    })
  }, [serial])

  const loadNet4g = useCallback(() => {
    setNet4gState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "NetXg" } }).then((result) => {
      const data = (result.data ?? null) as NetXgConfig | null
      setNet4gState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setNet4gEnable(String(data?.Enable ?? 0))
      setNet4gApn(String(data?.APN ?? ""))
      setNet4gMode(String(data?.Mode ?? 0))
      setNet4gAuthType(String(data?.AuthType ?? 0))
      setNet4gCenterNum(String(data?.CenterNum ?? ""))
      setNet4gRedialInter(String(data?.RedialInter ?? 10))
      setNet4gAbRestartEn(String(data?.AbRestartEn ?? 0))
      setNet4gUser(String(data?.User ?? ""))
      setNet4gPassword(String(data?.Pwd ?? ""))
    })
  }, [serial])

  const loadNetCms = useCallback(() => {
    setNetCmsState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "NetCms" } }).then((result) => {
      const data = (result.data ?? null) as NetCmsConfig | null
      setNetCmsState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      const count = data?.ChnNum ?? 0
      setNetCmsServers(
        Array.from({ length: count }, (_, index) => {
          const key = `Server_${String(index).padStart(2, "0")}` as keyof NetCmsConfig
          const server = data?.[key] as NetCmsServerConfig | undefined
          return {
            Enable: String(server?.Enable ?? 0),
            ServersAddr: String(server?.ServersAddr ?? ""),
            Protocol: String(server?.Protocol ?? 0),
            VisitType: String(server?.VisitType ?? 0),
          }
        })
      )
    })
  }, [serial])

  const loadNetFtp = useCallback(() => {
    setNetFtpState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "NetFtp" } }).then((result) => {
      const data = (result.data ?? null) as NetFtpConfig | null
      setNetFtpState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setNetFtpEnable(String(data?.Enable ?? 0))
      setNetFtpServerAddr(String(data?.ServersAddr ?? ""))
      setNetFtpUser(String(data?.User ?? ""))
      setNetFtpPassword(String(data?.Pwd ?? ""))
      setNetFtpVisitType(String(data?.VisitType ?? 0))
    })
  }, [serial])

  const loadPerUart = useCallback(() => {
    setPerUartState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "PerUart" } }).then((result) => {
      const data = (result.data ?? null) as PerUartConfig | null
      setPerUartState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setPerUartChannels(
        UART_KEYS.map((key) => {
          const channel = data?.[key] as PerUartChannelConfig | undefined
          return {
            Enable: String(channel?.Enable ?? 0),
            IntfType: String(channel?.IntfType ?? 0),
            DevType: String(channel?.DevType ?? 0),
            BaudRate: String(channel?.BaudRate ?? 3),
            DataBit: String(channel?.DataBit ?? 0),
            StopBit: String(channel?.StopBit ?? 0),
            Verify: String(channel?.Verify ?? 0),
          }
        })
      )
    })
  }, [serial])

  const loadPerIoOutput = useCallback(() => {
    setPerIoOutputState((prev) => ({ ...prev, loading: true, error: null }))
    postCommand(serial, { type: "request_config", payload: { paramType: "PerIoOutput" } }).then((result) => {
      const data = (result.data ?? null) as PerIoOutputConfig | null
      setPerIoOutputState({
        data,
        loading: false,
        error: result.error,
        loadedAt: new Date().toISOString(),
      })
      setIoOut1(String(data?.IoOut_1 ?? 0))
    })
  }, [serial])

  useEffect(() => {
    if (!serial) return
    loadDst()
    loadUser()
    loadDeviceInfo()
    loadPower()
    loadSystemTime()
    loadVehicleInfo()
    loadVehiclePosition()
    loadVehicleMileage()
    loadPreview()
    loadRecAttr()
    loadRecStreamMain()
    loadRecStreamSub()
    loadReCamAttr()
    loadReCapAttr()
    loadAlmIoIn()
    loadAlmSpd()
    loadAlmGsn()
    loadDriving()
    loadNetWired()
    loadNetWifi()
    loadNet4g()
    loadNetCms()
    loadNetFtp()
    loadPerUart()
    loadPerIoOutput()
  }, [serial, loadDst, loadUser, loadDeviceInfo, loadPower, loadSystemTime, loadVehicleInfo, loadVehiclePosition, loadVehicleMileage, loadPreview, loadRecAttr, loadRecStreamMain, loadRecStreamSub, loadReCamAttr, loadReCapAttr, loadAlmIoIn, loadAlmSpd, loadAlmGsn, loadDriving, loadNetWired, loadNetWifi, loadNet4g, loadNetCms, loadNetFtp, loadPerUart, loadPerIoOutput])

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

  const hasVehicleInfoChange = useMemo(() => {
    if (!vehicleInfoState.data) return false
    return (
      String(vehicleInfoState.data.CarPlate ?? "") !== plateNumber ||
      String(vehicleInfoState.data.DriverName ?? "") !== driverName ||
      String(vehicleInfoState.data.DriverLic ?? "") !== driverLicense ||
      String(vehicleInfoState.data.PhoneNum ?? "") !== phoneNumber ||
      String(vehicleInfoState.data.Company ?? "") !== company ||
      String(vehicleInfoState.data.AssemblyDate ?? "") !== installDate
    )
  }, [vehicleInfoState.data, plateNumber, driverName, driverLicense, phoneNumber, company, installDate])

  const saveVehicleInfo = useCallback(async () => {
    if (!vehicleInfoState.data) return
    setSavingVehicleInfo(true)
    setVehicleInfoMessage(null)

    const params: VehBaseInfoConfig = {
      ...vehicleInfoState.data,
      CarPlate: plateNumber,
      DriverName: driverName,
      DriverLic: driverLicense,
      PhoneNum: phoneNumber,
      Company: company,
      AssemblyDate: installDate,
    }
    delete params.ParamType

    const result = await updateConfig(serial, "VehBaseInfo", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save vehicle info"
      setVehicleInfoMessage(errMsg)
      addNotification("N62 Vehicle Info Save Failed", errMsg)
      setSavingVehicleInfo(false)
      return
    }

    setVehicleInfoMessage("Vehicle info updated")
    addNotification("N62 Vehicle Info Saved", `Vehicle info saved successfully for ${serial}.`)
    setSavingVehicleInfo(false)
    loadVehicleInfo()
  }, [serial, vehicleInfoState.data, plateNumber, driverName, driverLicense, phoneNumber, company, installDate, addNotification, loadVehicleInfo])

  const hasVehiclePositionChange = useMemo(() => {
    if (!vehiclePositionState.data) return false
    return (
      String(vehiclePositionState.data.GpsMode ?? 3) !== gpsMode ||
      String(vehiclePositionState.data.GpsUpInterval ?? 30) !== gpsInterval ||
      String(vehiclePositionState.data.GpsBatchNum ?? 1) !== gpsBatchUpload ||
      String(vehiclePositionState.data.SpdFilter ?? 5) !== speedFilter ||
      String(vehiclePositionState.data.SpdCorrV ?? 6) !== speedCorrection
    )
  }, [vehiclePositionState.data, gpsMode, gpsInterval, gpsBatchUpload, speedFilter, speedCorrection])

  const saveVehiclePosition = useCallback(async () => {
    if (!vehiclePositionState.data) return
    setSavingVehiclePosition(true)
    setVehiclePositionMessage(null)

    const parsedGpsMode = parseInt(gpsMode, 10)
    const parsedGpsInterval = parseInt(gpsInterval, 10)
    const parsedGpsBatchUpload = parseInt(gpsBatchUpload, 10)
    const parsedSpeedFilter = parseInt(speedFilter, 10)
    const parsedSpeedCorrection = parseInt(speedCorrection, 10)
    const params: VehPositionConfig = {
      ...vehiclePositionState.data,
      GpsMode: Number.isNaN(parsedGpsMode) ? (vehiclePositionState.data.GpsMode ?? 3) : parsedGpsMode,
      GpsUpInterval: Number.isNaN(parsedGpsInterval) ? (vehiclePositionState.data.GpsUpInterval ?? 30) : parsedGpsInterval,
      GpsBatchNum: Number.isNaN(parsedGpsBatchUpload) ? (vehiclePositionState.data.GpsBatchNum ?? 1) : parsedGpsBatchUpload,
      SpdFilter: Number.isNaN(parsedSpeedFilter) ? (vehiclePositionState.data.SpdFilter ?? 5) : parsedSpeedFilter,
      SpdCorrV: Number.isNaN(parsedSpeedCorrection) ? (vehiclePositionState.data.SpdCorrV ?? 6) : parsedSpeedCorrection,
    }
    delete params.ParamType

    const result = await updateConfig(serial, "VehPosition", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save position settings"
      setVehiclePositionMessage(errMsg)
      addNotification("N62 Position Save Failed", errMsg)
      setSavingVehiclePosition(false)
      return
    }

    setVehiclePositionMessage("Position settings updated")
    addNotification("N62 Position Saved", `Position settings saved successfully for ${serial}.`)
    setSavingVehiclePosition(false)
    loadVehiclePosition()
  }, [serial, vehiclePositionState.data, gpsMode, gpsInterval, gpsBatchUpload, speedFilter, speedCorrection, addNotification, loadVehiclePosition])

  const hasVehicleMileageChange = useMemo(() => {
    if (!vehicleMileageState.data) return false
    return String(vehicleMileageState.data.BaseV ?? 0) !== baseMileageValue
  }, [vehicleMileageState.data, baseMileageValue])

  const saveVehicleMileage = useCallback(async () => {
    if (!vehicleMileageState.data) return
    setSavingVehicleMileage(true)
    setVehicleMileageMessage(null)

    const parsedBaseMileageValue = parseInt(baseMileageValue, 10)
    const params: VehMileageConfig = {
      ...vehicleMileageState.data,
      BaseV: Number.isNaN(parsedBaseMileageValue) ? (vehicleMileageState.data.BaseV ?? 0) : parsedBaseMileageValue,
    }
    delete params.ParamType

    const result = await updateConfig(serial, "VehMileage", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save mileage settings"
      setVehicleMileageMessage(errMsg)
      addNotification("N62 Mileage Save Failed", errMsg)
      setSavingVehicleMileage(false)
      return
    }

    setVehicleMileageMessage("Mileage settings updated")
    addNotification("N62 Mileage Saved", `Mileage settings saved successfully for ${serial}.`)
    setSavingVehicleMileage(false)
    loadVehicleMileage()
  }, [serial, vehicleMileageState.data, baseMileageValue, addNotification, loadVehicleMileage])

  const hasPreviewChange = useMemo(() => {
    if (!previewState.data) return false
    return (
      String(previewState.data.OutVolume ?? 80) !== previewVolume ||
      String(previewState.data.Split ?? 1) !== previewSplit
    )
  }, [previewState.data, previewVolume, previewSplit])

  const savePreview = useCallback(async () => {
    if (!previewState.data) return
    setSavingPreview(true)
    setPreviewMessage(null)

    const parsedPreviewVolume = parseInt(previewVolume, 10)
    const parsedPreviewSplit = parseInt(previewSplit, 10)
    const params: PreviewConfig = {
      ...previewState.data,
      OutVolume: Number.isNaN(parsedPreviewVolume) ? (previewState.data.OutVolume ?? 80) : parsedPreviewVolume,
      Split: Number.isNaN(parsedPreviewSplit) ? (previewState.data.Split ?? 1) : parsedPreviewSplit,
    }
    delete params.ParamType

    const result = await updateConfig(serial, "Preview", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save preview settings"
      setPreviewMessage(errMsg)
      addNotification("N62 Preview Save Failed", errMsg)
      setSavingPreview(false)
      return
    }

    setPreviewMessage("Preview settings updated")
    addNotification("N62 Preview Saved", `Preview settings saved successfully for ${serial}.`)
    setSavingPreview(false)
    loadPreview()
  }, [serial, previewState.data, previewVolume, previewSplit, addNotification, loadPreview])

  const hasRecAttrChange = useMemo(() => {
    if (!recAttrState.data) return false
    return (
      String(recAttrState.data.Mode ?? 0) !== recMode ||
      String(recAttrState.data.Duration ?? 10) !== recDuration ||
      String(recAttrState.data.PreDuration ?? 5) !== recPreDuration ||
      String(recAttrState.data.SaveDays ?? 7) !== recSaveDays ||
      String(recAttrState.data.StreamType ?? 0) !== recStreamType ||
      String(recAttrState.data.FileFormat ?? 0) !== recFileFormat ||
      String(recAttrState.data.VencFormat ?? 1) !== recVencFormat
    )
  }, [recAttrState.data, recMode, recDuration, recPreDuration, recSaveDays, recStreamType, recFileFormat, recVencFormat])

  const saveRecAttr = useCallback(async () => {
    if (!recAttrState.data) return
    setSavingRecAttr(true)
    setRecAttrMessage(null)

    const params: RecAttrConfig = {
      ...recAttrState.data,
      Mode: Number.isNaN(parseInt(recMode, 10)) ? (recAttrState.data.Mode ?? 0) : parseInt(recMode, 10),
      Duration: Number.isNaN(parseInt(recDuration, 10)) ? (recAttrState.data.Duration ?? 10) : parseInt(recDuration, 10),
      PreDuration: Number.isNaN(parseInt(recPreDuration, 10)) ? (recAttrState.data.PreDuration ?? 5) : parseInt(recPreDuration, 10),
      SaveDays: Number.isNaN(parseInt(recSaveDays, 10)) ? (recAttrState.data.SaveDays ?? 7) : parseInt(recSaveDays, 10),
      StreamType: Number.isNaN(parseInt(recStreamType, 10)) ? (recAttrState.data.StreamType ?? 0) : parseInt(recStreamType, 10),
      FileFormat: Number.isNaN(parseInt(recFileFormat, 10)) ? (recAttrState.data.FileFormat ?? 0) : parseInt(recFileFormat, 10),
      VencFormat: Number.isNaN(parseInt(recVencFormat, 10)) ? (recAttrState.data.VencFormat ?? 1) : parseInt(recVencFormat, 10),
    }
    delete params.ParamType

    const result = await updateConfig(serial, "RecAttr", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save recording attributes"
      setRecAttrMessage(errMsg)
      addNotification("N62 Record Attr Save Failed", errMsg)
      setSavingRecAttr(false)
      return
    }

    setRecAttrMessage("Recording attributes updated")
    addNotification("N62 Record Attr Saved", `Recording attributes saved successfully for ${serial}.`)
    setSavingRecAttr(false)
    loadRecAttr()
  }, [serial, recAttrState.data, recMode, recDuration, recPreDuration, recSaveDays, recStreamType, recFileFormat, recVencFormat, addNotification, loadRecAttr])

  const hasRecStreamMainChange = useMemo(() => {
    if (!recStreamMainState.data) return false
    return RECORD_CHANNEL_KEYS.some((key, index) => {
      const channel = recStreamMainState.data?.[key] as RecStreamChannelConfig | undefined
      const draft = recStreamMainChannels[index]
      return (
        String(channel?.Enable ?? 0) !== draft.Enable ||
        String(channel?.AudioEn ?? 0) !== draft.AudioEn ||
        String(channel?.FrmRate ?? 15) !== draft.FrmRate ||
        String(channel?.Qp ?? 1) !== draft.Qp ||
        String(channel?.Res ?? 0) !== draft.Res
      )
    })
  }, [recStreamMainState.data, recStreamMainChannels])

  const saveRecStreamMain = useCallback(async () => {
    if (!recStreamMainState.data) return
    setSavingRecStreamMain(true)
    setRecStreamMainMessage(null)

    const params: RecStreamConfig = {
      ...recStreamMainState.data,
      ChnNum: recStreamMainState.data.ChnNum ?? recStreamMainChannels.length,
    }
    RECORD_CHANNEL_KEYS.forEach((key, index) => {
      const original = recStreamMainState.data?.[key] as RecStreamChannelConfig | undefined
      const draft = recStreamMainChannels[index]
      params[key] = {
        ...original,
        Enable: Number.isNaN(parseInt(draft.Enable, 10)) ? (original?.Enable ?? 0) : parseInt(draft.Enable, 10),
        AudioEn: Number.isNaN(parseInt(draft.AudioEn, 10)) ? (original?.AudioEn ?? 0) : parseInt(draft.AudioEn, 10),
        FrmRate: Number.isNaN(parseInt(draft.FrmRate, 10)) ? (original?.FrmRate ?? 15) : parseInt(draft.FrmRate, 10),
        Qp: Number.isNaN(parseInt(draft.Qp, 10)) ? (original?.Qp ?? 1) : parseInt(draft.Qp, 10),
        Res: Number.isNaN(parseInt(draft.Res, 10)) ? (original?.Res ?? 0) : parseInt(draft.Res, 10),
      }
    })
    delete params.ParamType

    const result = await updateConfig(serial, "RecStream_M", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save main stream settings"
      setRecStreamMainMessage(errMsg)
      addNotification("N62 Main Stream Save Failed", errMsg)
      setSavingRecStreamMain(false)
      return
    }

    setRecStreamMainMessage("Main stream settings updated")
    addNotification("N62 Main Stream Saved", `Main stream settings saved successfully for ${serial}.`)
    setSavingRecStreamMain(false)
    loadRecStreamMain()
  }, [serial, recStreamMainState.data, recStreamMainChannels, addNotification, loadRecStreamMain])

  const hasRecStreamSubChange = useMemo(() => {
    if (!recStreamSubState.data) return false
    return RECORD_CHANNEL_KEYS.some((key, index) => {
      const channel = recStreamSubState.data?.[key] as RecStreamChannelConfig | undefined
      const draft = recStreamSubChannels[index]
      return (
        String(channel?.Enable ?? 0) !== draft.Enable ||
        String(channel?.AudioEn ?? 0) !== draft.AudioEn ||
        String(channel?.FrmRate ?? 15) !== draft.FrmRate ||
        String(channel?.Qp ?? 1) !== draft.Qp ||
        String(channel?.Res ?? 0) !== draft.Res
      )
    })
  }, [recStreamSubState.data, recStreamSubChannels])

  const saveRecStreamSub = useCallback(async () => {
    if (!recStreamSubState.data) return
    setSavingRecStreamSub(true)
    setRecStreamSubMessage(null)

    const params: RecStreamConfig = {
      ...recStreamSubState.data,
      ChnNum: recStreamSubState.data.ChnNum ?? recStreamSubChannels.length,
    }
    RECORD_CHANNEL_KEYS.forEach((key, index) => {
      const original = recStreamSubState.data?.[key] as RecStreamChannelConfig | undefined
      const draft = recStreamSubChannels[index]
      params[key] = {
        ...original,
        Enable: Number.isNaN(parseInt(draft.Enable, 10)) ? (original?.Enable ?? 0) : parseInt(draft.Enable, 10),
        AudioEn: Number.isNaN(parseInt(draft.AudioEn, 10)) ? (original?.AudioEn ?? 0) : parseInt(draft.AudioEn, 10),
        FrmRate: Number.isNaN(parseInt(draft.FrmRate, 10)) ? (original?.FrmRate ?? 15) : parseInt(draft.FrmRate, 10),
        Qp: Number.isNaN(parseInt(draft.Qp, 10)) ? (original?.Qp ?? 1) : parseInt(draft.Qp, 10),
        Res: Number.isNaN(parseInt(draft.Res, 10)) ? (original?.Res ?? 0) : parseInt(draft.Res, 10),
      }
    })
    delete params.ParamType

    const result = await updateConfig(serial, "RecStream_S", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save sub stream settings"
      setRecStreamSubMessage(errMsg)
      addNotification("N62 Sub Stream Save Failed", errMsg)
      setSavingRecStreamSub(false)
      return
    }

    setRecStreamSubMessage("Sub stream settings updated")
    addNotification("N62 Sub Stream Saved", `Sub stream settings saved successfully for ${serial}.`)
    setSavingRecStreamSub(false)
    loadRecStreamSub()
  }, [serial, recStreamSubState.data, recStreamSubChannels, addNotification, loadRecStreamSub])

  const hasReCamAttrChange = useMemo(() => {
    if (!reCamAttrState.data) return false
    return RECORD_CHANNEL_KEYS.some((key, index) => {
      const channel = reCamAttrState.data?.[key] as ReCamChannelConfig | undefined
      const draft = reCamChannels[index]
      return (
        String(channel?.Enable ?? 0) !== draft.Enable ||
        String(channel?.Direction ?? 0) !== draft.Direction ||
        String(channel?.FrmRate ?? 0) !== draft.FrmRate ||
        String(channel?.Mode ?? 0) !== draft.Mode ||
        String(channel?.Res ?? 0) !== draft.Res ||
        String(channel?.Type ?? 0) !== draft.Type
      )
    })
  }, [reCamAttrState.data, reCamChannels])

  const saveReCamAttr = useCallback(async () => {
    if (!reCamAttrState.data) return
    setSavingReCamAttr(true)
    setReCamAttrMessage(null)

    const params: ReCamAttrConfig = {
      ...reCamAttrState.data,
      ChnNum: reCamAttrState.data.ChnNum ?? reCamChannels.length,
    }
    RECORD_CHANNEL_KEYS.forEach((key, index) => {
      const original = reCamAttrState.data?.[key] as ReCamChannelConfig | undefined
      const draft = reCamChannels[index]
      params[key] = {
        ...original,
        Enable: Number.isNaN(parseInt(draft.Enable, 10)) ? (original?.Enable ?? 0) : parseInt(draft.Enable, 10),
        Direction: Number.isNaN(parseInt(draft.Direction, 10)) ? (original?.Direction ?? 0) : parseInt(draft.Direction, 10),
        FrmRate: Number.isNaN(parseInt(draft.FrmRate, 10)) ? (original?.FrmRate ?? 0) : parseInt(draft.FrmRate, 10),
        Mode: Number.isNaN(parseInt(draft.Mode, 10)) ? (original?.Mode ?? 0) : parseInt(draft.Mode, 10),
        Res: Number.isNaN(parseInt(draft.Res, 10)) ? (original?.Res ?? 0) : parseInt(draft.Res, 10),
        Type: Number.isNaN(parseInt(draft.Type, 10)) ? (original?.Type ?? 0) : parseInt(draft.Type, 10),
      }
    })
    delete params.ParamType

    const result = await updateConfig(serial, "ReCamAttr", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save camera attributes"
      setReCamAttrMessage(errMsg)
      addNotification("N62 Camera Attr Save Failed", errMsg)
      setSavingReCamAttr(false)
      return
    }

    setReCamAttrMessage("Camera attributes updated")
    addNotification("N62 Camera Attr Saved", `Camera attributes saved successfully for ${serial}.`)
    setSavingReCamAttr(false)
    loadReCamAttr()
  }, [serial, reCamAttrState.data, reCamChannels, addNotification, loadReCamAttr])

  const hasReCapAttrChange = useMemo(() => {
    if (!reCapAttrState.data) return false
    return (
      String(reCapAttrState.data.Enable ?? 0) !== reCapEnable ||
      String(reCapAttrState.data.CapRes ?? 0) !== reCapRes ||
      String(reCapAttrState.data.ChnMask ?? 0) !== reCapChnMask ||
      String(reCapAttrState.data.Inteval ?? 300) !== reCapInterval ||
      String(reCapAttrState.data.Inteval_P ?? 300) !== reCapParkingInterval ||
      String(reCapAttrState.data.SaveDays ?? 30) !== reCapSaveDays
    )
  }, [reCapAttrState.data, reCapEnable, reCapRes, reCapChnMask, reCapInterval, reCapParkingInterval, reCapSaveDays])

  const saveReCapAttr = useCallback(async () => {
    if (!reCapAttrState.data) return
    setSavingReCapAttr(true)
    setReCapAttrMessage(null)

    const params: ReCapAttrConfig = {
      ...reCapAttrState.data,
      Enable: Number.isNaN(parseInt(reCapEnable, 10)) ? (reCapAttrState.data.Enable ?? 0) : parseInt(reCapEnable, 10),
      CapRes: Number.isNaN(parseInt(reCapRes, 10)) ? (reCapAttrState.data.CapRes ?? 0) : parseInt(reCapRes, 10),
      ChnMask: Number.isNaN(parseInt(reCapChnMask, 10)) ? (reCapAttrState.data.ChnMask ?? 0) : parseInt(reCapChnMask, 10),
      Inteval: Number.isNaN(parseInt(reCapInterval, 10)) ? (reCapAttrState.data.Inteval ?? 300) : parseInt(reCapInterval, 10),
      Inteval_P: Number.isNaN(parseInt(reCapParkingInterval, 10)) ? (reCapAttrState.data.Inteval_P ?? 300) : parseInt(reCapParkingInterval, 10),
      SaveDays: Number.isNaN(parseInt(reCapSaveDays, 10)) ? (reCapAttrState.data.SaveDays ?? 30) : parseInt(reCapSaveDays, 10),
    }
    delete params.ParamType

    const result = await updateConfig(serial, "ReCapAttr", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save capture attributes"
      setReCapAttrMessage(errMsg)
      addNotification("N62 Capture Attr Save Failed", errMsg)
      setSavingReCapAttr(false)
      return
    }

    setReCapAttrMessage("Capture attributes updated")
    addNotification("N62 Capture Attr Saved", `Capture attributes saved successfully for ${serial}.`)
    setSavingReCapAttr(false)
    loadReCapAttr()
  }, [serial, reCapAttrState.data, reCapEnable, reCapRes, reCapChnMask, reCapInterval, reCapParkingInterval, reCapSaveDays, addNotification, loadReCapAttr])

  const hasAlmIoInChange = useMemo(() => {
    if (!almIoInState.data) return false
    return RECORD_CHANNEL_KEYS.some((key, index) => {
      const channel = almIoInState.data?.[key] as AlmIoChannelConfig | undefined
      const draft = almIoChannels[index]
      return (
        String(channel?.En ?? 0) !== draft.En ||
        String(channel?.Type ?? 0) !== draft.Type ||
        String(channel?.Thr ?? 0) !== draft.Thr ||
        String(channel?.LnkParam ?? "") !== draft.LnkParam
      )
    })
  }, [almIoInState.data, almIoChannels])

  const saveAlmIoIn = useCallback(async () => {
    if (!almIoInState.data) return
    setSavingAlmIoIn(true)
    setAlmIoInMessage(null)

    const params: AlmIoInConfig = {
      ...almIoInState.data,
      ChnNum: almIoInState.data.ChnNum ?? almIoChannels.length,
    }
    RECORD_CHANNEL_KEYS.forEach((key, index) => {
      const original = almIoInState.data?.[key] as AlmIoChannelConfig | undefined
      const draft = almIoChannels[index]
      params[key] = {
        ...original,
        En: Number.isNaN(parseInt(draft.En, 10)) ? (original?.En ?? 0) : parseInt(draft.En, 10),
        Type: Number.isNaN(parseInt(draft.Type, 10)) ? (original?.Type ?? 0) : parseInt(draft.Type, 10),
        Thr: Number.isNaN(parseInt(draft.Thr, 10)) ? (original?.Thr ?? 0) : parseInt(draft.Thr, 10),
        LnkParam: draft.LnkParam,
      }
    })
    delete params.ParamType

    const result = await updateConfig(serial, "AlmIoIn", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save IO alarm settings"
      setAlmIoInMessage(errMsg)
      addNotification("N62 IO Alarm Save Failed", errMsg)
      setSavingAlmIoIn(false)
      return
    }

    setAlmIoInMessage("IO alarm settings updated")
    addNotification("N62 IO Alarm Saved", `IO alarm settings saved successfully for ${serial}.`)
    setSavingAlmIoIn(false)
    loadAlmIoIn()
  }, [serial, almIoInState.data, almIoChannels, addNotification, loadAlmIoIn])

  const hasAlmSpdChange = useMemo(() => {
    if (!almSpdState.data) return false
    return SPEED_ALARM_KEYS.some((key) => {
      const rule = almSpdState.data?.[key] as AlarmRuleConfig | undefined
      const draft = almSpdRules[key]
      return (
        String(typeof rule?.En === "boolean" ? Number(rule.En) : (rule?.En ?? 0)) !== draft.En ||
        String(rule?.Duration ?? 0) !== draft.Duration ||
        String(rule?.Thr ?? 0) !== draft.Thr ||
        String(rule?.LnkParam ?? "") !== draft.LnkParam
      )
    })
  }, [almSpdState.data, almSpdRules])

  const saveAlmSpd = useCallback(async () => {
    if (!almSpdState.data) return
    setSavingAlmSpd(true)
    setAlmSpdMessage(null)

    const params: AlmSpdConfig = {
      ...almSpdState.data,
      ChnNum: almSpdState.data.ChnNum ?? 4,
    }
    SPEED_ALARM_KEYS.forEach((key) => {
      const original = almSpdState.data?.[key] as AlarmRuleConfig | undefined
      const draft = almSpdRules[key]
      const parsedEn = parseInt(draft.En, 10)
      params[key] = {
        ...original,
        En: typeof original?.En === "boolean"
          ? (!Number.isNaN(parsedEn) && parsedEn === 1)
          : (Number.isNaN(parsedEn) ? (typeof original?.En === "number" ? original.En : 0) : parsedEn),
        Duration: Number.isNaN(parseInt(draft.Duration, 10)) ? (original?.Duration ?? 0) : parseInt(draft.Duration, 10),
        Thr: Number.isNaN(parseInt(draft.Thr, 10)) ? (original?.Thr ?? 0) : parseInt(draft.Thr, 10),
        LnkParam: draft.LnkParam,
      }
    })
    delete params.ParamType

    const result = await updateConfig(serial, "AlmSpd", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save speed alarm settings"
      setAlmSpdMessage(errMsg)
      addNotification("N62 Speed Alarm Save Failed", errMsg)
      setSavingAlmSpd(false)
      return
    }

    setAlmSpdMessage("Speed alarm settings updated")
    addNotification("N62 Speed Alarm Saved", `Speed alarm settings saved successfully for ${serial}.`)
    setSavingAlmSpd(false)
    loadAlmSpd()
  }, [serial, almSpdState.data, almSpdRules, addNotification, loadAlmSpd])

  const hasAlmGsnChange = useMemo(() => {
    if (!almGsnState.data) return false
    const topLevelChanged =
      String(almGsnState.data.Install ?? 0) !== almGsnInstall ||
      String(almGsnState.data.Mode ?? 0) !== almGsnMode
    if (topLevelChanged) return true
    return G_SENSOR_ALARM_KEYS.some((key) => {
      const rule = almGsnState.data?.[key] as AlarmRuleConfig | undefined
      const draft = almGsnRules[key]
      return (
        String(typeof rule?.En === "boolean" ? Number(rule.En) : (rule?.En ?? 0)) !== draft.En ||
        String(rule?.Thr ?? 0) !== draft.Thr ||
        String(rule?.LnkParam ?? "") !== draft.LnkParam
      )
    })
  }, [almGsnState.data, almGsnInstall, almGsnMode, almGsnRules])

  const saveAlmGsn = useCallback(async () => {
    if (!almGsnState.data) return
    setSavingAlmGsn(true)
    setAlmGsnMessage(null)

    const params: AlmGsnConfig = {
      ...almGsnState.data,
      Install: Number.isNaN(parseInt(almGsnInstall, 10)) ? (almGsnState.data.Install ?? 0) : parseInt(almGsnInstall, 10),
      Mode: Number.isNaN(parseInt(almGsnMode, 10)) ? (almGsnState.data.Mode ?? 0) : parseInt(almGsnMode, 10),
      ChnNum: almGsnState.data.ChnNum ?? 4,
    }
    G_SENSOR_ALARM_KEYS.forEach((key) => {
      const original = almGsnState.data?.[key] as AlarmRuleConfig | undefined
      const draft = almGsnRules[key]
      const parsedEn = parseInt(draft.En, 10)
      params[key] = {
        ...original,
        En: typeof original?.En === "boolean"
          ? (!Number.isNaN(parsedEn) && parsedEn === 1)
          : (Number.isNaN(parsedEn) ? (typeof original?.En === "number" ? original.En : 0) : parsedEn),
        Thr: Number.isNaN(parseInt(draft.Thr, 10)) ? (original?.Thr ?? 0) : parseInt(draft.Thr, 10),
        LnkParam: draft.LnkParam,
      }
    })
    delete params.ParamType

    const result = await updateConfig(serial, "AlmGsn", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save G-sensor alarm settings"
      setAlmGsnMessage(errMsg)
      addNotification("N62 G-Sensor Save Failed", errMsg)
      setSavingAlmGsn(false)
      return
    }

    setAlmGsnMessage("G-sensor alarm settings updated")
    addNotification("N62 G-Sensor Saved", `G-sensor alarm settings saved successfully for ${serial}.`)
    setSavingAlmGsn(false)
    loadAlmGsn()
  }, [serial, almGsnState.data, almGsnInstall, almGsnMode, almGsnRules, addNotification, loadAlmGsn])

  const hasDrivingChange = useMemo(() => {
    if (!drivingState.data) return false
    if (String(drivingState.data.MinRest ?? 15) !== drivingMinRest) return true
    return DRIVING_ALARM_KEYS.some((key) => {
      const rule = drivingState.data?.[key] as AlarmRuleConfig | undefined
      const draft = drivingRules[key]
      return (
        String(typeof rule?.En === "boolean" ? Number(rule.En) : (rule?.En ?? 0)) !== draft.En ||
        String(rule?.Thr ?? 0) !== draft.Thr ||
        String(rule?.LnkParam ?? "") !== draft.LnkParam
      )
    })
  }, [drivingState.data, drivingMinRest, drivingRules])

  const saveDriving = useCallback(async () => {
    if (!drivingState.data) return
    setSavingDriving(true)
    setDrivingMessage(null)

    const params: DrivingConfig = {
      ...drivingState.data,
      ChnNum: drivingState.data.ChnNum ?? 4,
      MinRest: Number.isNaN(parseInt(drivingMinRest, 10)) ? (drivingState.data.MinRest ?? 15) : parseInt(drivingMinRest, 10),
    }
    DRIVING_ALARM_KEYS.forEach((key) => {
      const original = drivingState.data?.[key] as AlarmRuleConfig | undefined
      const draft = drivingRules[key]
      const parsedEn = parseInt(draft.En, 10)
      params[key] = {
        ...original,
        En: typeof original?.En === "boolean"
          ? (!Number.isNaN(parsedEn) && parsedEn === 1)
          : (Number.isNaN(parsedEn) ? (typeof original?.En === "number" ? original.En : 0) : parsedEn),
        Thr: Number.isNaN(parseInt(draft.Thr, 10)) ? (original?.Thr ?? 0) : parseInt(draft.Thr, 10),
        LnkParam: draft.LnkParam,
      }
    })
    delete params.ParamType

    const result = await updateConfig(serial, "Driving", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save driving alarm settings"
      setDrivingMessage(errMsg)
      addNotification("N62 Driving Alarm Save Failed", errMsg)
      setSavingDriving(false)
      return
    }

    setDrivingMessage("Driving alarm settings updated")
    addNotification("N62 Driving Alarm Saved", `Driving alarm settings saved successfully for ${serial}.`)
    setSavingDriving(false)
    loadDriving()
  }, [serial, drivingState.data, drivingMinRest, drivingRules, addNotification, loadDriving])

  const hasNetWiredChange = useMemo(() => {
    if (!netWiredState.data) return false
    return (
      String(netWiredState.data.Enable ?? 0) !== netWiredEnable ||
      String(netWiredState.data.DhcpEn ?? 0) !== netWiredDhcp ||
      String(netWiredState.data.IP ?? "") !== netWiredIp ||
      String(netWiredState.data.SubMask ?? "") !== netWiredMask ||
      String(netWiredState.data.Gateway ?? "") !== netWiredGateway ||
      String(netWiredState.data.DNS1 ?? "") !== netWiredDns1 ||
      String(netWiredState.data.DNS2 ?? "") !== netWiredDns2
    )
  }, [netWiredState.data, netWiredEnable, netWiredDhcp, netWiredIp, netWiredMask, netWiredGateway, netWiredDns1, netWiredDns2])

  const saveNetWired = useCallback(async () => {
    if (!netWiredState.data) return
    setSavingNetWired(true)
    setNetWiredMessage(null)

    const params: NetWiredConfig = {
      ...netWiredState.data,
      Enable: Number.isNaN(parseInt(netWiredEnable, 10)) ? (netWiredState.data.Enable ?? 0) : parseInt(netWiredEnable, 10),
      DhcpEn: Number.isNaN(parseInt(netWiredDhcp, 10)) ? (netWiredState.data.DhcpEn ?? 0) : parseInt(netWiredDhcp, 10),
      IP: netWiredIp,
      SubMask: netWiredMask,
      Gateway: netWiredGateway,
      DNS1: netWiredDns1,
      DNS2: netWiredDns2,
    }
    delete params.ParamType

    const result = await updateConfig(serial, "NetWired", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save wired network settings"
      setNetWiredMessage(errMsg)
      addNotification("N62 Wired Network Save Failed", errMsg)
      setSavingNetWired(false)
      return
    }

    setNetWiredMessage("Wired network settings updated")
    addNotification("N62 Wired Network Saved", `Wired network settings saved successfully for ${serial}.`)
    setSavingNetWired(false)
    loadNetWired()
  }, [serial, netWiredState.data, netWiredEnable, netWiredDhcp, netWiredIp, netWiredMask, netWiredGateway, netWiredDns1, netWiredDns2, addNotification, loadNetWired])

  const hasNetWifiChange = useMemo(() => {
    if (!netWifiState.data) return false
    return (
      String(netWifiState.data.Enable ?? 0) !== netWifiEnable ||
      String(netWifiState.data.SSID ?? "") !== netWifiSsid ||
      String(netWifiState.data.Mode ?? 0) !== netWifiMode ||
      String(netWifiState.data.EncryptType ?? 0) !== netWifiEncryptType ||
      String(netWifiState.data.DhcpEn ?? 0) !== netWifiDhcp ||
      String(netWifiState.data.Pwd ?? "") !== netWifiPassword
    )
  }, [netWifiState.data, netWifiEnable, netWifiSsid, netWifiMode, netWifiEncryptType, netWifiDhcp, netWifiPassword])

  const saveNetWifi = useCallback(async () => {
    if (!netWifiState.data) return
    setSavingNetWifi(true)
    setNetWifiMessage(null)

    const params: NetWifiConfig = {
      ...netWifiState.data,
      Enable: Number.isNaN(parseInt(netWifiEnable, 10)) ? (netWifiState.data.Enable ?? 0) : parseInt(netWifiEnable, 10),
      SSID: netWifiSsid,
      Mode: Number.isNaN(parseInt(netWifiMode, 10)) ? (netWifiState.data.Mode ?? 0) : parseInt(netWifiMode, 10),
      EncryptType: Number.isNaN(parseInt(netWifiEncryptType, 10)) ? (netWifiState.data.EncryptType ?? 0) : parseInt(netWifiEncryptType, 10),
      DhcpEn: Number.isNaN(parseInt(netWifiDhcp, 10)) ? (netWifiState.data.DhcpEn ?? 0) : parseInt(netWifiDhcp, 10),
      Pwd: netWifiPassword,
    }
    delete params.ParamType

    const result = await updateConfig(serial, "NetWifi", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save WiFi settings"
      setNetWifiMessage(errMsg)
      addNotification("N62 WiFi Save Failed", errMsg)
      setSavingNetWifi(false)
      return
    }

    setNetWifiMessage("WiFi settings updated")
    addNotification("N62 WiFi Saved", `WiFi settings saved successfully for ${serial}.`)
    setSavingNetWifi(false)
    loadNetWifi()
  }, [serial, netWifiState.data, netWifiEnable, netWifiSsid, netWifiMode, netWifiEncryptType, netWifiDhcp, netWifiPassword, addNotification, loadNetWifi])

  const hasNet4gChange = useMemo(() => {
    if (!net4gState.data) return false
    return (
      String(net4gState.data.Enable ?? 0) !== net4gEnable ||
      String(net4gState.data.APN ?? "") !== net4gApn ||
      String(net4gState.data.Mode ?? 0) !== net4gMode ||
      String(net4gState.data.AuthType ?? 0) !== net4gAuthType ||
      String(net4gState.data.CenterNum ?? "") !== net4gCenterNum ||
      String(net4gState.data.RedialInter ?? 10) !== net4gRedialInter ||
      String(net4gState.data.AbRestartEn ?? 0) !== net4gAbRestartEn ||
      String(net4gState.data.User ?? "") !== net4gUser ||
      String(net4gState.data.Pwd ?? "") !== net4gPassword
    )
  }, [net4gState.data, net4gEnable, net4gApn, net4gMode, net4gAuthType, net4gCenterNum, net4gRedialInter, net4gAbRestartEn, net4gUser, net4gPassword])

  const saveNet4g = useCallback(async () => {
    if (!net4gState.data) return
    setSavingNet4g(true)
    setNet4gMessage(null)

    const params: NetXgConfig = {
      ...net4gState.data,
      Enable: Number.isNaN(parseInt(net4gEnable, 10)) ? (net4gState.data.Enable ?? 0) : parseInt(net4gEnable, 10),
      APN: net4gApn,
      Mode: Number.isNaN(parseInt(net4gMode, 10)) ? (net4gState.data.Mode ?? 0) : parseInt(net4gMode, 10),
      AuthType: Number.isNaN(parseInt(net4gAuthType, 10)) ? (net4gState.data.AuthType ?? 0) : parseInt(net4gAuthType, 10),
      CenterNum: net4gCenterNum,
      RedialInter: Number.isNaN(parseInt(net4gRedialInter, 10)) ? (net4gState.data.RedialInter ?? 10) : parseInt(net4gRedialInter, 10),
      AbRestartEn: Number.isNaN(parseInt(net4gAbRestartEn, 10)) ? (net4gState.data.AbRestartEn ?? 0) : parseInt(net4gAbRestartEn, 10),
      User: net4gUser,
      Pwd: net4gPassword,
    }
    delete params.ParamType

    const result = await updateConfig(serial, "NetXg", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save 4G settings"
      setNet4gMessage(errMsg)
      addNotification("N62 4G Save Failed", errMsg)
      setSavingNet4g(false)
      return
    }

    setNet4gMessage("4G settings updated")
    addNotification("N62 4G Saved", `4G settings saved successfully for ${serial}.`)
    setSavingNet4g(false)
    loadNet4g()
  }, [serial, net4gState.data, net4gEnable, net4gApn, net4gMode, net4gAuthType, net4gCenterNum, net4gRedialInter, net4gAbRestartEn, net4gUser, net4gPassword, addNotification, loadNet4g])

  const hasNetCmsChange = useMemo(() => {
    if (!netCmsState.data) return false
    const count = netCmsState.data.ChnNum ?? 0
    if (count !== netCmsServers.length) return true
    return netCmsServers.some((server, index) => {
      const key = `Server_${String(index).padStart(2, "0")}` as keyof NetCmsConfig
      const original = netCmsState.data?.[key] as NetCmsServerConfig | undefined
      return (
        String(original?.Enable ?? 0) !== server.Enable ||
        String(original?.ServersAddr ?? "") !== server.ServersAddr ||
        String(original?.Protocol ?? 0) !== server.Protocol ||
        String(original?.VisitType ?? 0) !== server.VisitType
      )
    })
  }, [netCmsState.data, netCmsServers])

  const saveNetCms = useCallback(async () => {
    if (!netCmsState.data) return
    setSavingNetCms(true)
    setNetCmsMessage(null)

    const params: NetCmsConfig = {
      ...netCmsState.data,
      ChnNum: netCmsState.data.ChnNum ?? netCmsServers.length,
    }
    netCmsServers.forEach((server, index) => {
      const key = `Server_${String(index).padStart(2, "0")}` as keyof NetCmsConfig
      const original = netCmsState.data?.[key] as NetCmsServerConfig | undefined
      params[key] = {
        ...original,
        Enable: Number.isNaN(parseInt(server.Enable, 10)) ? (original?.Enable ?? 0) : parseInt(server.Enable, 10),
        ServersAddr: server.ServersAddr,
        Protocol: Number.isNaN(parseInt(server.Protocol, 10)) ? (original?.Protocol ?? 0) : parseInt(server.Protocol, 10),
        VisitType: Number.isNaN(parseInt(server.VisitType, 10)) ? (original?.VisitType ?? 0) : parseInt(server.VisitType, 10),
      }
    })
    delete params.ParamType

    const result = await updateConfig(serial, "NetCms", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save CMS settings"
      setNetCmsMessage(errMsg)
      addNotification("N62 CMS Save Failed", errMsg)
      setSavingNetCms(false)
      return
    }

    setNetCmsMessage("CMS settings updated")
    addNotification("N62 CMS Saved", `CMS settings saved successfully for ${serial}.`)
    setSavingNetCms(false)
    loadNetCms()
  }, [serial, netCmsState.data, netCmsServers, addNotification, loadNetCms])

  const hasNetFtpChange = useMemo(() => {
    if (!netFtpState.data) return false
    return (
      String(netFtpState.data.Enable ?? 0) !== netFtpEnable ||
      String(netFtpState.data.ServersAddr ?? "") !== netFtpServerAddr ||
      String(netFtpState.data.User ?? "") !== netFtpUser ||
      String(netFtpState.data.Pwd ?? "") !== netFtpPassword ||
      String(netFtpState.data.VisitType ?? 0) !== netFtpVisitType
    )
  }, [netFtpState.data, netFtpEnable, netFtpServerAddr, netFtpUser, netFtpPassword, netFtpVisitType])

  const saveNetFtp = useCallback(async () => {
    if (!netFtpState.data) return
    setSavingNetFtp(true)
    setNetFtpMessage(null)

    const params: NetFtpConfig = {
      ...netFtpState.data,
      Enable: Number.isNaN(parseInt(netFtpEnable, 10)) ? (netFtpState.data.Enable ?? 0) : parseInt(netFtpEnable, 10),
      ServersAddr: netFtpServerAddr,
      User: netFtpUser,
      Pwd: netFtpPassword,
      VisitType: Number.isNaN(parseInt(netFtpVisitType, 10)) ? (netFtpState.data.VisitType ?? 0) : parseInt(netFtpVisitType, 10),
    }
    delete params.ParamType

    const result = await updateConfig(serial, "NetFtp", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save FTP settings"
      setNetFtpMessage(errMsg)
      addNotification("N62 FTP Save Failed", errMsg)
      setSavingNetFtp(false)
      return
    }

    setNetFtpMessage("FTP settings updated")
    addNotification("N62 FTP Saved", `FTP settings saved successfully for ${serial}.`)
    setSavingNetFtp(false)
    loadNetFtp()
  }, [serial, netFtpState.data, netFtpEnable, netFtpServerAddr, netFtpUser, netFtpPassword, netFtpVisitType, addNotification, loadNetFtp])

  const hasPerUartChange = useMemo(() => {
    if (!perUartState.data) return false
    return UART_KEYS.some((key, index) => {
      const channel = perUartState.data?.[key] as PerUartChannelConfig | undefined
      const draft = perUartChannels[index]
      return (
        String(channel?.Enable ?? 0) !== draft.Enable ||
        String(channel?.IntfType ?? 0) !== draft.IntfType ||
        String(channel?.DevType ?? 0) !== draft.DevType ||
        String(channel?.BaudRate ?? 3) !== draft.BaudRate ||
        String(channel?.DataBit ?? 0) !== draft.DataBit ||
        String(channel?.StopBit ?? 0) !== draft.StopBit ||
        String(channel?.Verify ?? 0) !== draft.Verify
      )
    })
  }, [perUartState.data, perUartChannels])

  const savePerUart = useCallback(async () => {
    if (!perUartState.data) return
    setSavingPerUart(true)
    setPerUartMessage(null)

    const params: PerUartConfig = { ...perUartState.data }
    UART_KEYS.forEach((key, index) => {
      const original = perUartState.data?.[key] as PerUartChannelConfig | undefined
      const draft = perUartChannels[index]
      params[key] = {
        ...original,
        Enable: Number.isNaN(parseInt(draft.Enable, 10)) ? (original?.Enable ?? 0) : parseInt(draft.Enable, 10),
        IntfType: Number.isNaN(parseInt(draft.IntfType, 10)) ? (original?.IntfType ?? 0) : parseInt(draft.IntfType, 10),
        DevType: Number.isNaN(parseInt(draft.DevType, 10)) ? (original?.DevType ?? 0) : parseInt(draft.DevType, 10),
        BaudRate: Number.isNaN(parseInt(draft.BaudRate, 10)) ? (original?.BaudRate ?? 3) : parseInt(draft.BaudRate, 10),
        DataBit: Number.isNaN(parseInt(draft.DataBit, 10)) ? (original?.DataBit ?? 0) : parseInt(draft.DataBit, 10),
        StopBit: Number.isNaN(parseInt(draft.StopBit, 10)) ? (original?.StopBit ?? 0) : parseInt(draft.StopBit, 10),
        Verify: Number.isNaN(parseInt(draft.Verify, 10)) ? (original?.Verify ?? 0) : parseInt(draft.Verify, 10),
      }
    })
    delete params.ParamType

    const result = await updateConfig(serial, "PerUart", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save UART settings"
      setPerUartMessage(errMsg)
      addNotification("N62 UART Save Failed", errMsg)
      setSavingPerUart(false)
      return
    }

    setPerUartMessage("UART settings updated")
    addNotification("N62 UART Saved", `UART settings saved successfully for ${serial}.`)
    setSavingPerUart(false)
    loadPerUart()
  }, [serial, perUartState.data, perUartChannels, addNotification, loadPerUart])

  const hasPerIoOutputChange = useMemo(() => {
    if (!perIoOutputState.data) return false
    return String(perIoOutputState.data.IoOut_1 ?? 0) !== ioOut1
  }, [perIoOutputState.data, ioOut1])

  const savePerIoOutput = useCallback(async () => {
    if (!perIoOutputState.data) return
    setSavingPerIoOutput(true)
    setPerIoOutputMessage(null)

    const params: PerIoOutputConfig = {
      ...perIoOutputState.data,
      IoOut_1: Number.isNaN(parseInt(ioOut1, 10)) ? (perIoOutputState.data.IoOut_1 ?? 0) : parseInt(ioOut1, 10),
    }
    delete params.ParamType

    const result = await updateConfig(serial, "PerIoOutput", params)
    if (!result.ok) {
      const errMsg = result.error || "Failed to save IO output settings"
      setPerIoOutputMessage(errMsg)
      addNotification("N62 IO Output Save Failed", errMsg)
      setSavingPerIoOutput(false)
      return
    }

    setPerIoOutputMessage("IO output settings updated")
    addNotification("N62 IO Output Saved", `IO output settings saved successfully for ${serial}.`)
    setSavingPerIoOutput(false)
    loadPerIoOutput()
  }, [serial, perIoOutputState.data, ioOut1, addNotification, loadPerIoOutput])

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

      {activeTab === "vehicle" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Vehicle Info</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadVehicleInfo}
                  disabled={vehicleInfoState.loading || savingVehicleInfo}
                >
                  {vehicleInfoState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveVehicleInfo} disabled={!hasVehicleInfoChange || savingVehicleInfo || vehicleInfoState.loading}>
                  {savingVehicleInfo ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save vehicle info
                    </>
                  )}
                </Button>
              </div>
            </div>
            {vehicleInfoState.error && <p className="text-sm text-red-600">{vehicleInfoState.error}</p>}
            {vehicleInfoMessage && <p className="text-sm text-gray-700">{vehicleInfoMessage}</p>}
            {vehicleInfoState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(vehicleInfoState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Plate Number</label>
                <Input value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Install Date</label>
                <Input value={installDate} onChange={(e) => setInstallDate(e.target.value)} placeholder="YYYY/MM/DD" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Driver Name</label>
                <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Driver License</label>
                <Input value={driverLicense} onChange={(e) => setDriverLicense(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Phone Number</label>
                <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Company</label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Position</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadVehiclePosition}
                  disabled={vehiclePositionState.loading || savingVehiclePosition}
                >
                  {vehiclePositionState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveVehiclePosition} disabled={!hasVehiclePositionChange || savingVehiclePosition || vehiclePositionState.loading}>
                  {savingVehiclePosition ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save position
                    </>
                  )}
                </Button>
              </div>
            </div>
            {vehiclePositionState.error && <p className="text-sm text-red-600">{vehiclePositionState.error}</p>}
            {vehiclePositionMessage && <p className="text-sm text-gray-700">{vehiclePositionMessage}</p>}
            {vehiclePositionState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(vehiclePositionState.loadedAt).toLocaleString()}</p>
            )}
            <div className="space-y-2">
              <label className="text-sm text-gray-700">Mode</label>
              <Select value={gpsMode} onValueChange={setGpsMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_POSITION_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">GPS Interval</label>
                <Input type="number" value={gpsInterval} onChange={(e) => setGpsInterval(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">GPS Batch Upload</label>
                <Input type="number" value={gpsBatchUpload} onChange={(e) => setGpsBatchUpload(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Speed Filter (km/h)</label>
                <Input type="number" value={speedFilter} onChange={(e) => setSpeedFilter(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Speed Correction</label>
                <Input type="number" value={speedCorrection} onChange={(e) => setSpeedCorrection(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Mileage</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadVehicleMileage}
                  disabled={vehicleMileageState.loading || savingVehicleMileage}
                >
                  {vehicleMileageState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveVehicleMileage} disabled={!hasVehicleMileageChange || savingVehicleMileage || vehicleMileageState.loading}>
                  {savingVehicleMileage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save mileage
                    </>
                  )}
                </Button>
              </div>
            </div>
            {vehicleMileageState.error && <p className="text-sm text-red-600">{vehicleMileageState.error}</p>}
            {vehicleMileageMessage && <p className="text-sm text-gray-700">{vehicleMileageMessage}</p>}
            {vehicleMileageState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(vehicleMileageState.loadedAt).toLocaleString()}</p>
            )}
            <div className="max-w-md space-y-2">
              <label className="text-sm text-gray-700">Base Value</label>
              <Input type="number" value={baseMileageValue} onChange={(e) => setBaseMileageValue(e.target.value)} />
            </div>
          </div>
        </div>
      ) : activeTab === "preview" ? (
        <div className="grid grid-cols-1 gap-5">
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Preview</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadPreview}
                  disabled={previewState.loading || savingPreview}
                >
                  {previewState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={savePreview} disabled={!hasPreviewChange || savingPreview || previewState.loading}>
                  {savingPreview ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save preview
                    </>
                  )}
                </Button>
              </div>
            </div>
            {previewState.error && <p className="text-sm text-red-600">{previewState.error}</p>}
            {previewMessage && <p className="text-sm text-gray-700">{previewMessage}</p>}
            {previewState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(previewState.loadedAt).toLocaleString()}</p>
            )}
            <p className="text-sm text-gray-600">
              Only the confirmed live-device preview fields are exposed here for now.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Volume</label>
                <Input
                  type="number"
                  value={previewVolume}
                  onChange={(e) => setPreviewVolume(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Split</label>
                <Input
                  type="number"
                  value={previewSplit}
                  onChange={(e) => setPreviewSplit(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "record" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Recording Attributes</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadRecAttr} disabled={recAttrState.loading || savingRecAttr}>
                  {recAttrState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveRecAttr} disabled={!hasRecAttrChange || savingRecAttr || recAttrState.loading}>
                  {savingRecAttr ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save record attr
                    </>
                  )}
                </Button>
              </div>
            </div>
            {recAttrState.error && <p className="text-sm text-red-600">{recAttrState.error}</p>}
            {recAttrMessage && <p className="text-sm text-gray-700">{recAttrMessage}</p>}
            {recAttrState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(recAttrState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Mode</label>
                <Input type="number" value={recMode} onChange={(e) => setRecMode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Duration</label>
                <Input type="number" value={recDuration} onChange={(e) => setRecDuration(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Pre Duration</label>
                <Input type="number" value={recPreDuration} onChange={(e) => setRecPreDuration(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Save Days</label>
                <Input type="number" value={recSaveDays} onChange={(e) => setRecSaveDays(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Stream Type</label>
                <Input type="number" value={recStreamType} onChange={(e) => setRecStreamType(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">File Format</label>
                <Input type="number" value={recFileFormat} onChange={(e) => setRecFileFormat(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Venc Format</label>
                <Input type="number" value={recVencFormat} onChange={(e) => setRecVencFormat(e.target.value)} />
              </div>
              <div className="border rounded p-3 text-sm">
                <div className="text-gray-500">Encrypt</div>
                <div className="font-medium text-gray-900 break-all">{String(recAttrState.data?.Encrypt ?? "—")}</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Capture Attributes</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadReCapAttr} disabled={reCapAttrState.loading || savingReCapAttr}>
                  {reCapAttrState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveReCapAttr} disabled={!hasReCapAttrChange || savingReCapAttr || reCapAttrState.loading}>
                  {savingReCapAttr ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save capture attr
                    </>
                  )}
                </Button>
              </div>
            </div>
            {reCapAttrState.error && <p className="text-sm text-red-600">{reCapAttrState.error}</p>}
            {reCapAttrMessage && <p className="text-sm text-gray-700">{reCapAttrMessage}</p>}
            {reCapAttrState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(reCapAttrState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Enable</label>
                <Select value={reCapEnable} onValueChange={setReCapEnable}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Disabled</SelectItem>
                    <SelectItem value="1">Enabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Cap Res</label>
                <Input type="number" value={reCapRes} onChange={(e) => setReCapRes(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Chn Mask</label>
                <Input type="number" value={reCapChnMask} onChange={(e) => setReCapChnMask(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Interval</label>
                <Input type="number" value={reCapInterval} onChange={(e) => setReCapInterval(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Parking Interval</label>
                <Input type="number" value={reCapParkingInterval} onChange={(e) => setReCapParkingInterval(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Save Days</label>
                <Input type="number" value={reCapSaveDays} onChange={(e) => setReCapSaveDays(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Main Stream</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadRecStreamMain} disabled={recStreamMainState.loading || savingRecStreamMain}>
                  {recStreamMainState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveRecStreamMain} disabled={!hasRecStreamMainChange || savingRecStreamMain || recStreamMainState.loading}>
                  {savingRecStreamMain ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save main stream
                    </>
                  )}
                </Button>
              </div>
            </div>
            {recStreamMainState.error && <p className="text-sm text-red-600">{recStreamMainState.error}</p>}
            {recStreamMainMessage && <p className="text-sm text-gray-700">{recStreamMainMessage}</p>}
            {recStreamMainState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(recStreamMainState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {RECORD_CHANNEL_KEYS.map((key, index) => (
                <div key={key} className="border rounded p-3 space-y-3">
                  <div className="text-sm font-medium text-gray-900">Channel {index + 1}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Enable</label>
                      <Select value={recStreamMainChannels[index].Enable} onValueChange={(value) => setRecStreamMainChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Enable: value } : channel))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Disabled</SelectItem>
                          <SelectItem value="1">Enabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Audio En</label>
                      <Select value={recStreamMainChannels[index].AudioEn} onValueChange={(value) => setRecStreamMainChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, AudioEn: value } : channel))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Disabled</SelectItem>
                          <SelectItem value="1">Enabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Frame Rate</label>
                      <Input type="number" value={recStreamMainChannels[index].FrmRate} onChange={(e) => setRecStreamMainChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, FrmRate: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Qp</label>
                      <Input type="number" value={recStreamMainChannels[index].Qp} onChange={(e) => setRecStreamMainChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Qp: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs text-gray-700">Resolution</label>
                      <Input type="number" value={recStreamMainChannels[index].Res} onChange={(e) => setRecStreamMainChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Res: e.target.value } : channel))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Sub Stream</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadRecStreamSub} disabled={recStreamSubState.loading || savingRecStreamSub}>
                  {recStreamSubState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveRecStreamSub} disabled={!hasRecStreamSubChange || savingRecStreamSub || recStreamSubState.loading}>
                  {savingRecStreamSub ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save sub stream
                    </>
                  )}
                </Button>
              </div>
            </div>
            {recStreamSubState.error && <p className="text-sm text-red-600">{recStreamSubState.error}</p>}
            {recStreamSubMessage && <p className="text-sm text-gray-700">{recStreamSubMessage}</p>}
            {recStreamSubState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(recStreamSubState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {RECORD_CHANNEL_KEYS.map((key, index) => (
                <div key={key} className="border rounded p-3 space-y-3">
                  <div className="text-sm font-medium text-gray-900">Channel {index + 1}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Enable</label>
                      <Select value={recStreamSubChannels[index].Enable} onValueChange={(value) => setRecStreamSubChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Enable: value } : channel))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Disabled</SelectItem>
                          <SelectItem value="1">Enabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Audio En</label>
                      <Select value={recStreamSubChannels[index].AudioEn} onValueChange={(value) => setRecStreamSubChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, AudioEn: value } : channel))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Disabled</SelectItem>
                          <SelectItem value="1">Enabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Frame Rate</label>
                      <Input type="number" value={recStreamSubChannels[index].FrmRate} onChange={(e) => setRecStreamSubChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, FrmRate: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Qp</label>
                      <Input type="number" value={recStreamSubChannels[index].Qp} onChange={(e) => setRecStreamSubChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Qp: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs text-gray-700">Resolution</label>
                      <Input type="number" value={recStreamSubChannels[index].Res} onChange={(e) => setRecStreamSubChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Res: e.target.value } : channel))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Camera Attributes</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadReCamAttr} disabled={reCamAttrState.loading || savingReCamAttr}>
                  {reCamAttrState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveReCamAttr} disabled={!hasReCamAttrChange || savingReCamAttr || reCamAttrState.loading}>
                  {savingReCamAttr ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save camera attr
                    </>
                  )}
                </Button>
              </div>
            </div>
            {reCamAttrState.error && <p className="text-sm text-red-600">{reCamAttrState.error}</p>}
            {reCamAttrMessage && <p className="text-sm text-gray-700">{reCamAttrMessage}</p>}
            {reCamAttrState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(reCamAttrState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {RECORD_CHANNEL_KEYS.map((key, index) => (
                <div key={key} className="border rounded p-3 space-y-3">
                  <div className="text-sm font-medium text-gray-900">Channel {index + 1}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Enable</label>
                      <Select value={reCamChannels[index].Enable} onValueChange={(value) => setReCamChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Enable: value } : channel))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Disabled</SelectItem>
                          <SelectItem value="1">Enabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Direction</label>
                      <Input type="number" value={reCamChannels[index].Direction} onChange={(e) => setReCamChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Direction: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Frame Rate</label>
                      <Input type="number" value={reCamChannels[index].FrmRate} onChange={(e) => setReCamChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, FrmRate: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Mode</label>
                      <Input type="number" value={reCamChannels[index].Mode} onChange={(e) => setReCamChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Mode: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Resolution</label>
                      <Input type="number" value={reCamChannels[index].Res} onChange={(e) => setReCamChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Res: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Type</label>
                      <Input type="number" value={reCamChannels[index].Type} onChange={(e) => setReCamChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Type: e.target.value } : channel))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "alarm" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">IO Alarm Inputs</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadAlmIoIn} disabled={almIoInState.loading || savingAlmIoIn}>
                  {almIoInState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveAlmIoIn} disabled={!hasAlmIoInChange || savingAlmIoIn || almIoInState.loading}>
                  {savingAlmIoIn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save IO alarms
                    </>
                  )}
                </Button>
              </div>
            </div>
            {almIoInState.error && <p className="text-sm text-red-600">{almIoInState.error}</p>}
            {almIoInMessage && <p className="text-sm text-gray-700">{almIoInMessage}</p>}
            {almIoInState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(almIoInState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {RECORD_CHANNEL_KEYS.map((key, index) => (
                <div key={key} className="border rounded p-3 space-y-3">
                  <div className="text-sm font-medium text-gray-900">Channel {index + 1}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Enable</label>
                      <Select value={almIoChannels[index].En} onValueChange={(value) => setAlmIoChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, En: value } : channel))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Disabled</SelectItem>
                          <SelectItem value="1">Enabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Type</label>
                      <Input type="number" value={almIoChannels[index].Type} onChange={(e) => setAlmIoChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Type: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Threshold</label>
                      <Input type="number" value={almIoChannels[index].Thr} onChange={(e) => setAlmIoChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Thr: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs text-gray-700">Link Param</label>
                      <Input value={almIoChannels[index].LnkParam} onChange={(e) => setAlmIoChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, LnkParam: e.target.value } : channel))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Speed Alarms</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadAlmSpd} disabled={almSpdState.loading || savingAlmSpd}>
                  {almSpdState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveAlmSpd} disabled={!hasAlmSpdChange || savingAlmSpd || almSpdState.loading}>
                  {savingAlmSpd ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save speed alarms
                    </>
                  )}
                </Button>
              </div>
            </div>
            {almSpdState.error && <p className="text-sm text-red-600">{almSpdState.error}</p>}
            {almSpdMessage && <p className="text-sm text-gray-700">{almSpdMessage}</p>}
            {almSpdState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(almSpdState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {SPEED_ALARM_KEYS.map((key) => (
                <div key={key} className="border rounded p-3 space-y-3">
                  <div className="text-sm font-medium text-gray-900">
                    {key === "MaxSpd" ? "Max Speed" : key === "MinSpd" ? "Min Speed" : "Parking"}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Enable</label>
                    <Select value={almSpdRules[key].En} onValueChange={(value) => setAlmSpdRules((prev) => ({ ...prev, [key]: { ...prev[key], En: value } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Disabled</SelectItem>
                        <SelectItem value="1">Enabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Duration</label>
                    <Input type="number" value={almSpdRules[key].Duration} onChange={(e) => setAlmSpdRules((prev) => ({ ...prev, [key]: { ...prev[key], Duration: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Threshold</label>
                    <Input type="number" value={almSpdRules[key].Thr} onChange={(e) => setAlmSpdRules((prev) => ({ ...prev, [key]: { ...prev[key], Thr: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Link Param</label>
                    <Input value={almSpdRules[key].LnkParam} onChange={(e) => setAlmSpdRules((prev) => ({ ...prev, [key]: { ...prev[key], LnkParam: e.target.value } }))} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">G-Sensor Alarms</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadAlmGsn} disabled={almGsnState.loading || savingAlmGsn}>
                  {almGsnState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveAlmGsn} disabled={!hasAlmGsnChange || savingAlmGsn || almGsnState.loading}>
                  {savingAlmGsn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save G-sensor
                    </>
                  )}
                </Button>
              </div>
            </div>
            {almGsnState.error && <p className="text-sm text-red-600">{almGsnState.error}</p>}
            {almGsnMessage && <p className="text-sm text-gray-700">{almGsnMessage}</p>}
            {almGsnState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(almGsnState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Install</label>
                <Input type="number" value={almGsnInstall} onChange={(e) => setAlmGsnInstall(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Mode</label>
                <Input type="number" value={almGsnMode} onChange={(e) => setAlmGsnMode(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {G_SENSOR_ALARM_KEYS.map((key) => (
                <div key={key} className="border rounded p-3 space-y-3">
                  <div className="text-sm font-medium text-gray-900">
                    {key === "SlwDown" ? "Slow Down" : key === "SpdUp" ? "Speed Up" : key}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Enable</label>
                    <Select value={almGsnRules[key].En} onValueChange={(value) => setAlmGsnRules((prev) => ({ ...prev, [key]: { ...prev[key], En: value } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Disabled</SelectItem>
                        <SelectItem value="1">Enabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Threshold</label>
                    <Input type="number" value={almGsnRules[key].Thr} onChange={(e) => setAlmGsnRules((prev) => ({ ...prev, [key]: { ...prev[key], Thr: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Link Param</label>
                    <Input value={almGsnRules[key].LnkParam} onChange={(e) => setAlmGsnRules((prev) => ({ ...prev, [key]: { ...prev[key], LnkParam: e.target.value } }))} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Driving Alarms</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadDriving} disabled={drivingState.loading || savingDriving}>
                  {drivingState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveDriving} disabled={!hasDrivingChange || savingDriving || drivingState.loading}>
                  {savingDriving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save driving alarms
                    </>
                  )}
                </Button>
              </div>
            </div>
            {drivingState.error && <p className="text-sm text-red-600">{drivingState.error}</p>}
            {drivingMessage && <p className="text-sm text-gray-700">{drivingMessage}</p>}
            {drivingState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(drivingState.loadedAt).toLocaleString()}</p>
            )}
            <div className="max-w-md space-y-2">
              <label className="text-sm text-gray-700">Min Rest</label>
              <Input type="number" value={drivingMinRest} onChange={(e) => setDrivingMinRest(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {DRIVING_ALARM_KEYS.map((key) => (
                <div key={key} className="border rounded p-3 space-y-3">
                  <div className="text-sm font-medium text-gray-900">
                    {key === "PreTimeOut" ? "Pre Timeout" : key === "PreTired" ? "Pre Tired" : key === "TimeOut" ? "Timeout" : "Tired"}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Enable</label>
                    <Select value={drivingRules[key].En} onValueChange={(value) => setDrivingRules((prev) => ({ ...prev, [key]: { ...prev[key], En: value } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Disabled</SelectItem>
                        <SelectItem value="1">Enabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Threshold</label>
                    <Input type="number" value={drivingRules[key].Thr} onChange={(e) => setDrivingRules((prev) => ({ ...prev, [key]: { ...prev[key], Thr: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Link Param</label>
                    <Input value={drivingRules[key].LnkParam} onChange={(e) => setDrivingRules((prev) => ({ ...prev, [key]: { ...prev[key], LnkParam: e.target.value } }))} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "network" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Wired Network</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadNetWired} disabled={netWiredState.loading || savingNetWired}>
                  {netWiredState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveNetWired} disabled={!hasNetWiredChange || savingNetWired || netWiredState.loading}>
                  {savingNetWired ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save wired
                    </>
                  )}
                </Button>
              </div>
            </div>
            {netWiredState.error && <p className="text-sm text-red-600">{netWiredState.error}</p>}
            {netWiredMessage && <p className="text-sm text-gray-700">{netWiredMessage}</p>}
            {netWiredState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(netWiredState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Enable</label>
                <Select value={netWiredEnable} onValueChange={setNetWiredEnable}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Disabled</SelectItem>
                    <SelectItem value="1">Enabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">DHCP</label>
                <Select value={netWiredDhcp} onValueChange={setNetWiredDhcp}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Disabled</SelectItem>
                    <SelectItem value="1">Enabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">IP</label>
                <Input value={netWiredIp} onChange={(e) => setNetWiredIp(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Subnet Mask</label>
                <Input value={netWiredMask} onChange={(e) => setNetWiredMask(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Gateway</label>
                <Input value={netWiredGateway} onChange={(e) => setNetWiredGateway(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">DNS1</label>
                <Input value={netWiredDns1} onChange={(e) => setNetWiredDns1(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm text-gray-700">DNS2</label>
                <Input value={netWiredDns2} onChange={(e) => setNetWiredDns2(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">WiFi</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadNetWifi} disabled={netWifiState.loading || savingNetWifi}>
                  {netWifiState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveNetWifi} disabled={!hasNetWifiChange || savingNetWifi || netWifiState.loading}>
                  {savingNetWifi ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save WiFi
                    </>
                  )}
                </Button>
              </div>
            </div>
            {netWifiState.error && <p className="text-sm text-red-600">{netWifiState.error}</p>}
            {netWifiMessage && <p className="text-sm text-gray-700">{netWifiMessage}</p>}
            {netWifiState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(netWifiState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Enable</label>
                <Select value={netWifiEnable} onValueChange={setNetWifiEnable}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Disabled</SelectItem>
                    <SelectItem value="1">Enabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">DHCP</label>
                <Select value={netWifiDhcp} onValueChange={setNetWifiDhcp}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Disabled</SelectItem>
                    <SelectItem value="1">Enabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm text-gray-700">SSID</label>
                <Input value={netWifiSsid} onChange={(e) => setNetWifiSsid(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Mode</label>
                <Input type="number" value={netWifiMode} onChange={(e) => setNetWifiMode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Encrypt Type</label>
                <Input type="number" value={netWifiEncryptType} onChange={(e) => setNetWifiEncryptType(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm text-gray-700">Password</label>
                <Input value={netWifiPassword} onChange={(e) => setNetWifiPassword(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">4G</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadNet4g} disabled={net4gState.loading || savingNet4g}>
                  {net4gState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveNet4g} disabled={!hasNet4gChange || savingNet4g || net4gState.loading}>
                  {savingNet4g ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save 4G
                    </>
                  )}
                </Button>
              </div>
            </div>
            {net4gState.error && <p className="text-sm text-red-600">{net4gState.error}</p>}
            {net4gMessage && <p className="text-sm text-gray-700">{net4gMessage}</p>}
            {net4gState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(net4gState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Enable</label>
                <Select value={net4gEnable} onValueChange={setNet4gEnable}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Disabled</SelectItem>
                    <SelectItem value="1">Enabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Mode</label>
                <Input type="number" value={net4gMode} onChange={(e) => setNet4gMode(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm text-gray-700">APN</label>
                <Input value={net4gApn} onChange={(e) => setNet4gApn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Auth Type</label>
                <Input type="number" value={net4gAuthType} onChange={(e) => setNet4gAuthType(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Center Number</label>
                <Input value={net4gCenterNum} onChange={(e) => setNet4gCenterNum(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Redial Interval</label>
                <Input type="number" value={net4gRedialInter} onChange={(e) => setNet4gRedialInter(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Abnormal Restart</label>
                <Select value={net4gAbRestartEn} onValueChange={setNet4gAbRestartEn}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Disabled</SelectItem>
                    <SelectItem value="1">Enabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">User</label>
                <Input value={net4gUser} onChange={(e) => setNet4gUser(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Password</label>
                <Input value={net4gPassword} onChange={(e) => setNet4gPassword(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">FTP</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadNetFtp} disabled={netFtpState.loading || savingNetFtp}>
                  {netFtpState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveNetFtp} disabled={!hasNetFtpChange || savingNetFtp || netFtpState.loading}>
                  {savingNetFtp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save FTP
                    </>
                  )}
                </Button>
              </div>
            </div>
            {netFtpState.error && <p className="text-sm text-red-600">{netFtpState.error}</p>}
            {netFtpMessage && <p className="text-sm text-gray-700">{netFtpMessage}</p>}
            {netFtpState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(netFtpState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Enable</label>
                <Select value={netFtpEnable} onValueChange={setNetFtpEnable}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Disabled</SelectItem>
                    <SelectItem value="1">Enabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Visit Type</label>
                <Input type="number" value={netFtpVisitType} onChange={(e) => setNetFtpVisitType(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm text-gray-700">Server Address</label>
                <Input value={netFtpServerAddr} onChange={(e) => setNetFtpServerAddr(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">User</label>
                <Input value={netFtpUser} onChange={(e) => setNetFtpUser(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Password</label>
                <Input value={netFtpPassword} onChange={(e) => setNetFtpPassword(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">CMS Servers</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadNetCms} disabled={netCmsState.loading || savingNetCms}>
                  {netCmsState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={saveNetCms} disabled={!hasNetCmsChange || savingNetCms || netCmsState.loading}>
                  {savingNetCms ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save CMS
                    </>
                  )}
                </Button>
              </div>
            </div>
            {netCmsState.error && <p className="text-sm text-red-600">{netCmsState.error}</p>}
            {netCmsMessage && <p className="text-sm text-gray-700">{netCmsMessage}</p>}
            {netCmsState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(netCmsState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {netCmsServers.map((server, index) => (
                <div key={index} className="border rounded p-3 space-y-3">
                  <div className="text-sm font-medium text-gray-900">Server {index}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Enable</label>
                      <Select value={server.Enable} onValueChange={(value) => setNetCmsServers((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, Enable: value } : item))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Disabled</SelectItem>
                          <SelectItem value="1">Enabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Protocol</label>
                      <Input type="number" value={server.Protocol} onChange={(e) => setNetCmsServers((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, Protocol: e.target.value } : item))} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs text-gray-700">Server Address</label>
                      <Input value={server.ServersAddr} onChange={(e) => setNetCmsServers((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, ServersAddr: e.target.value } : item))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Visit Type</label>
                      <Input type="number" value={server.VisitType} onChange={(e) => setNetCmsServers((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, VisitType: e.target.value } : item))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "peripheral" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">UART</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadPerUart} disabled={perUartState.loading || savingPerUart}>
                  {perUartState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={savePerUart} disabled={!hasPerUartChange || savingPerUart || perUartState.loading}>
                  {savingPerUart ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save UART
                    </>
                  )}
                </Button>
              </div>
            </div>
            {perUartState.error && <p className="text-sm text-red-600">{perUartState.error}</p>}
            {perUartMessage && <p className="text-sm text-gray-700">{perUartMessage}</p>}
            {perUartState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(perUartState.loadedAt).toLocaleString()}</p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {UART_KEYS.map((key, index) => (
                <div key={key} className="border rounded p-3 space-y-3">
                  <div className="text-sm font-medium text-gray-900">UART {index}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Enable</label>
                      <Select value={perUartChannels[index].Enable} onValueChange={(value) => setPerUartChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Enable: value } : channel))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Disabled</SelectItem>
                          <SelectItem value="1">Enabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Interface Type</label>
                      <Input type="number" value={perUartChannels[index].IntfType} onChange={(e) => setPerUartChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, IntfType: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Device Type</label>
                      <Input type="number" value={perUartChannels[index].DevType} onChange={(e) => setPerUartChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, DevType: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Baud Rate</label>
                      <Input type="number" value={perUartChannels[index].BaudRate} onChange={(e) => setPerUartChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, BaudRate: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Data Bit</label>
                      <Input type="number" value={perUartChannels[index].DataBit} onChange={(e) => setPerUartChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, DataBit: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-700">Stop Bit</label>
                      <Input type="number" value={perUartChannels[index].StopBit} onChange={(e) => setPerUartChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, StopBit: e.target.value } : channel))} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs text-gray-700">Verify</label>
                      <Input type="number" value={perUartChannels[index].Verify} onChange={(e) => setPerUartChannels((prev) => prev.map((channel, channelIndex) => channelIndex === index ? { ...channel, Verify: e.target.value } : channel))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">IO Output</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadPerIoOutput} disabled={perIoOutputState.loading || savingPerIoOutput}>
                  {perIoOutputState.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={savePerIoOutput} disabled={!hasPerIoOutputChange || savingPerIoOutput || perIoOutputState.loading}>
                  {savingPerIoOutput ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save IO output
                    </>
                  )}
                </Button>
              </div>
            </div>
            {perIoOutputState.error && <p className="text-sm text-red-600">{perIoOutputState.error}</p>}
            {perIoOutputMessage && <p className="text-sm text-gray-700">{perIoOutputMessage}</p>}
            {perIoOutputState.loadedAt && (
              <p className="text-xs text-gray-500">Loaded: {new Date(perIoOutputState.loadedAt).toLocaleString()}</p>
            )}
            <div className="max-w-md space-y-2">
              <label className="text-sm text-gray-700">IoOut 1</label>
              <Input type="number" value={ioOut1} onChange={(e) => setIoOut1(e.target.value)} />
            </div>
          </div>
        </div>
      ) : activeTab !== "general" ? (
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
