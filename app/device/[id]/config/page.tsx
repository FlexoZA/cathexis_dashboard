"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save, RefreshCw, Settings, ToggleLeft, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
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
import { normalizeConfigResponse } from "@/lib/unit-capabilities"
import { ConfigShell } from "@/components/device-shell/config-shell"
import { SectionTabs } from "@/components/device-shell/section-tabs"
import { getCapabilitiesForUnit, getSectionOrderForUnit, normalizeProtocol } from "@/lib/units/registry"
import type { UnitCapabilities } from "@/lib/units/types"
import { N62DeviceConfig } from "@/components/devices/n62/n62-device-config"
import { NotificationsSidebar } from "@/components/notifications-sidebar"

interface Device {
  id: number
  friendly_name: string | null
  serial: string | null
  device_model: string | null
  protocol: string | null
}

interface DeviceConfigResponse {
  ok: boolean
  data?: {
    config: Record<string, any>
    capabilities?: UnitCapabilities
  }
  error?: string
}

const defaultSectionOrder = [
  'general',
  'network',
  'cameras',
  'face_recognition',
  'eventpreviews',
  'description',
  'events',
] as const

export default function DeviceConfigPage() {
  const params = useParams()
  const router = useRouter()
  const deviceId = params.id as string

  const [device, setDevice] = useState<Device | null>(null)
  const [config, setConfig] = useState<any | null>(null)
  const [initialConfig, setInitialConfig] = useState<any | null>(null)
  const [capabilities, setCapabilities] = useState<UnitCapabilities | null>(null)
  const [loadingDevice, setLoadingDevice] = useState(true)
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showApnPassword, setShowApnPassword] = useState(false)
  const [visibleWifiPasswords, setVisibleWifiPasswords] = useState<Record<number, boolean>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, any>>({})
  const [activeSection, setActiveSection] = useState<string>('general')

  useEffect(() => {
    fetchDevice()
  }, [deviceId])

  async function fetchDevice() {
    try {
      setLoadingDevice(true)
      console.log("DEBUG::DeviceConfigPage", { action: "fetchDevice", deviceId })

      const { data, error: dbError } = await supabase
        .from('mvr_devices')
        .select('id, friendly_name, serial, device_model, protocol')
        .eq('id', parseInt(deviceId))
        .single()

      if (dbError) {
        throw dbError
      }

      if (!data) {
        throw new Error('Device not found')
      }

      const record = data as any

      const mapped: Device = {
        id: record.id,
        friendly_name: record.friendly_name,
        serial: record.serial,
        device_model: record.device_model,
        protocol: record.protocol,
      }

      setDevice(mapped)

      if (mapped.serial) {
        const resolvedProtocol = getCapabilitiesForUnit({
          serial: mapped.serial,
          deviceModel: mapped.device_model,
          protocol: mapped.protocol,
        }).protocol
        if (resolvedProtocol === "jt808") {
          setConfig({})
          setInitialConfig({})
          return
        }
        await fetchConfig(mapped.serial, mapped.device_model, mapped.protocol)
      } else {
        setError('Device serial not available')
      }
    } catch (err: any) {
      console.log("DEBUG::DeviceConfigPage", { action: "fetchDeviceError", error: err })
      setError(err.message || 'Failed to load device')
    } finally {
      setLoadingDevice(false)
    }
  }

  async function fetchConfig(serial: string, deviceModel?: string | null, protocol?: string | null) {
    try {
      setLoadingConfig(true)
      setError(null)
      console.log("DEBUG::DeviceConfigPage", { action: "fetchConfig", serial })

      const response = await fetch(
        `/api/device-config?serial=${encodeURIComponent(serial)}&deviceModel=${encodeURIComponent(deviceModel || '')}&protocol=${encodeURIComponent(protocol || '')}`
      )
      const data: DeviceConfigResponse = await response.json()

      if (!data.ok) {
        throw new Error(data.error || 'Failed to load config from device')
      }

      const normalized = normalizeConfigResponse(data.data, serial, deviceModel, protocol)
      setConfig(normalized.config)
      setInitialConfig(normalized.config)
      setCapabilities(normalized.capabilities)
      setSaveMessage(null)
    } catch (err: any) {
      console.log("DEBUG::DeviceConfigPage", { action: "fetchConfigError", error: err })
      setError(err.message || 'Failed to load config')
    } finally {
      setLoadingConfig(false)
    }
  }

  function deepEqual(a: any, b: any): boolean {
    if (a === b) return true
    if (typeof a !== typeof b) return false
    if (a && b && typeof a === 'object') {
      if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false
        return a.every((item, idx) => deepEqual(item, b[idx]))
      }
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      if (keysA.length !== keysB.length) return false
      return keysA.every((key) => deepEqual(a[key], (b as any)[key]))
    }
    return false
  }

  function extractChanges(current: any, initial: any): any {
    if (current === undefined) return undefined
    if (deepEqual(current, initial)) return undefined
    if (Array.isArray(current) || typeof current !== 'object' || current === null) {
      return current
    }

    const result: Record<string, any> = {}
    Object.keys(current || {}).forEach((key) => {
      const change = extractChanges(current[key], initial?.[key])
      if (change !== undefined) {
        result[key] = change
      }
    })

    return Object.keys(result).length > 0 ? result : undefined
  }

  const effectiveCapabilities = useMemo(() => {
    if (capabilities) return capabilities
    return getCapabilitiesForUnit({
      serial: device?.serial,
      deviceModel: device?.device_model,
      protocol: normalizeProtocol(device?.protocol),
    })
  }, [capabilities, device?.serial, device?.device_model, device?.protocol])

  const editableSections = useMemo(
    () => new Set(effectiveCapabilities.editableSections || []),
    [effectiveCapabilities]
  )

  const sectionOrder = useMemo(() => {
    const fromModule = getSectionOrderForUnit(
      config || {},
      effectiveCapabilities,
      {
        serial: device?.serial,
        deviceModel: device?.device_model,
        protocol: normalizeProtocol(device?.protocol),
      }
    )
    const filteredDefault = defaultSectionOrder.filter((section) => fromModule.includes(section))
    const extras = fromModule.filter((section) => !filteredDefault.includes(section as any))
    const ordered = [...filteredDefault, ...extras]
    return ordered.length > 0 ? ordered : [...defaultSectionOrder]
  }, [config, effectiveCapabilities, device?.serial, device?.device_model, device?.protocol])

  useEffect(() => {
    if (!sectionOrder.includes(activeSection)) {
      setActiveSection(sectionOrder[0] || 'general')
    }
  }, [sectionOrder, activeSection])

  function buildSectionUpdates(section: string): Record<string, any> {
    if (!config || !initialConfig) return {}

    // Cameras have strict shape requirements on the device side; send full section for safety.
    if (section === 'cameras' && Array.isArray(config.cameras)) {
      if (!config.cameras) return {}
      return { cameras: config.cameras }
    }

    const diff = extractChanges(config[section], initialConfig[section])
    if (diff === undefined) return {}

    // Some sections have mandatory fields even when unchanged.
    if (section === 'general') {
      const account = initialConfig.general?.account ?? 'unassigned'
      const merged = { ...diff }
      if (merged.account === undefined) {
        merged.account = account
      }
      return { general: merged }
    }

    return { [section]: diff }
  }

  const changedSections = useMemo(() => {
    if (!config || !initialConfig) return []
    return sectionOrder.filter((key) => !deepEqual(config[key], initialConfig[key]))
  }, [config, initialConfig, sectionOrder])

  const sectionChangedMap = useMemo(() => {
    const flags = {} as Record<string, boolean>
    sectionOrder.forEach((key) => {
      flags[key] = changedSections.includes(key)
    })
    return flags
  }, [changedSections])

  const hasChanges = changedSections.length > 0

  function buildUpdates(): Record<string, any> {
    const updates: Record<string, any> = {}
    if (!config || !initialConfig) return updates
    sectionOrder.forEach((key) => {
      if (editableSections.size > 0 && !editableSections.has(key)) return
      const sectionUpdate = buildSectionUpdates(key)
      if (Object.keys(sectionUpdate).length > 0) {
        Object.assign(updates, sectionUpdate)
      }
    })
    return updates
  }

  async function handleSave(updatesOverride?: Record<string, any>) {
    if (!device?.serial || !config || !initialConfig) return
    const updates = updatesOverride || buildUpdates()
    const nonEditable = Object.keys(updates).filter(
      (section) => editableSections.size > 0 && !editableSections.has(section)
    )

    if (nonEditable.length > 0) {
      setSaveMessage(`Cannot update read-only sections: ${nonEditable.join(', ')}`)
      setConfirmOpen(false)
      return
    }

    if (Object.keys(updates).length === 0) {
      setSaveMessage('No changes to save')
      setConfirmOpen(false)
      return
    }

    try {
      setSaving(true)
      setSaveMessage(null)
      console.log("DEBUG::DeviceConfigPage", { action: "saveConfig", serial: device.serial, updates: Object.keys(updates) })

      const response = await fetch('/api/device-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial: device.serial,
          protocol: device.protocol,
          deviceModel: device.device_model,
          updates,
          capabilities: effectiveCapabilities,
        }),
      })

      const data = await response.json()

      if (!data.ok) {
        throw new Error(data.error || 'Device rejected config update')
      }

      setInitialConfig(config)
      setSaveMessage('Changes saved to device')
      setConfirmOpen(false)
    } catch (err: any) {
      console.log("DEBUG::DeviceConfigPage", { action: "saveConfigError", error: err })
      setError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  function openSaveConfirm(updatesOverride?: Record<string, any>) {
    const updates = updatesOverride || buildUpdates()
    if (Object.keys(updates).length === 0) {
      setSaveMessage('No changes to save')
      return
    }
    setPendingUpdates(updates)
    setConfirmOpen(true)
  }

  function resetChanges() {
    if (!initialConfig) return
    setConfig(initialConfig)
    setSaveMessage(null)
  }

  function updateGeneralField(key: string, value: any) {
    setConfig((prev: any) => {
      if (!prev) return prev
      return {
        ...prev,
        general: {
          ...prev.general,
          [key]: value,
        },
      }
    })
  }

  function updateNetworkField(key: string, value: any) {
    setConfig((prev: any) => {
      if (!prev) return prev
      return {
        ...prev,
        network: {
          ...prev.network,
          [key]: value,
        },
      }
    })
  }

  function updateSipConfigField(key: string, value: any) {
    setConfig((prev: any) => {
      if (!prev) return prev
      return {
        ...prev,
        network: {
          ...prev.network,
          sip_config: {
            ...prev.network?.sip_config,
            [key]: value,
          },
        },
      }
    })
  }

  function updateExtraWifiField(index: number, key: string, value: any) {
    setConfig((prev: any) => {
      if (!prev) return prev
      const list = [...(prev.network?.extra_wifi_configs?.extra_wifi || [])]
      if (!list[index]) return prev
      list[index] = { ...list[index], [key]: value }
      return {
        ...prev,
        network: {
          ...prev.network,
          extra_wifi_configs: {
            ...(prev.network?.extra_wifi_configs || {}),
            extra_wifi: list,
          },
        },
      }
    })
  }

  function addExtraWifi() {
    setConfig((prev: any) => {
      if (!prev) return prev
      const list = [...(prev.network?.extra_wifi_configs?.extra_wifi || [])]
      list.push({ ssid: '', password: '', type: 0 })
      return {
        ...prev,
        network: {
          ...prev.network,
          extra_wifi_configs: {
            ...(prev.network?.extra_wifi_configs || {}),
            extra_wifi: list,
          },
        },
      }
    })

    setVisibleWifiPasswords((prev) => {
      const next = { ...prev }
      next[Object.keys(next).length] = false
      return next
    })
  }

  function removeExtraWifi(index: number) {
    setConfig((prev: any) => {
      if (!prev) return prev
      const list = [...(prev.network?.extra_wifi_configs?.extra_wifi || [])]
      if (!list[index]) return prev
      list.splice(index, 1)
      return {
        ...prev,
        network: {
          ...prev.network,
          extra_wifi_configs: {
            ...(prev.network?.extra_wifi_configs || {}),
            extra_wifi: list,
          },
        },
      }
    })

    setVisibleWifiPasswords((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  function updateFaceRecField(key: string, value: any) {
    setConfig((prev: any) => {
      if (!prev) return prev
      return {
        ...prev,
        face_recognition: {
          ...prev.face_recognition,
          [key]: value,
        },
      }
    })
  }

  function updateDescriptionField(key: string, value: any) {
    setConfig((prev: any) => {
      if (!prev) return prev
      return {
        ...prev,
        description: {
          ...prev.description,
          [key]: value,
        },
      }
    })
  }

  function updateEventPreview(index: number, field: 'road' | 'cab', value: boolean) {
    setConfig((prev: any) => {
      if (!prev) return prev
      const updated = [...(prev.eventpreviews || [])]
      if (!updated[index]) return prev
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, eventpreviews: updated }
    })
  }

  function updateCameraField(cameraIndex: number, key: string, value: any) {
    setConfig((prev: any) => {
      if (!prev) return prev
      const cameras = [...(prev.cameras || [])]
      if (!cameras[cameraIndex]) return prev
      cameras[cameraIndex] = { ...cameras[cameraIndex], [key]: value }
      return { ...prev, cameras }
    })
  }

  function updateCameraProfileField(cameraIndex: number, profileIndex: number, key: string, value: any) {
    setConfig((prev: any) => {
      if (!prev) return prev
      const cameras = [...(prev.cameras || [])]
      if (!cameras[cameraIndex]) return prev
      const profiles = [...(cameras[cameraIndex].profiles || [])]
      if (!profiles[profileIndex]) return prev
      profiles[profileIndex] = { ...profiles[profileIndex], [key]: value }
      cameras[cameraIndex] = { ...cameras[cameraIndex], profiles }
      return { ...prev, cameras }
    })
  }

  function renderBooleanToggle(id: string, checked: boolean, onChange: (next: boolean) => void) {
    return (
      <div className="flex items-center gap-2">
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
        <span className="text-sm text-gray-700">{checked ? 'On' : 'Off'}</span>
      </div>
    )
  }

  if (loadingDevice || loadingConfig) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 py-12 flex items-center justify-center text-gray-700 gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading device configuration...</span>
        </div>
      </div>
    )
  }

  const isJt808 = getCapabilitiesForUnit({
    serial: device?.serial,
    deviceModel: device?.device_model,
    protocol: device?.protocol,
  }).protocol === "jt808"

  if (error || !device || (!isJt808 && !config)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-destructive mb-4">{error || 'Unable to load device configuration'}</p>
            <Button onClick={() => router.push(`/device/${deviceId}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Device
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isJt808 && device.serial) {
    return (
      <ConfigShell
        deviceId={device.id}
        deviceName={device.friendly_name || "Unnamed Device"}
        serial={device.serial}
        hasChanges={false}
        saving={false}
        onReset={() => {}}
      >
        <div className="w-full lg:pr-[360px]">
          <NotificationsSidebar />
          <N62DeviceConfig serial={device.serial} />
        </div>
      </ConfigShell>
    )
  }

  return (
    <ConfigShell
      deviceId={device.id}
      deviceName={device.friendly_name || 'Unnamed Device'}
      serial={device.serial || 'No serial'}
      hasChanges={hasChanges}
      saving={saving}
      onReset={resetChanges}
    >
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-gray-700">
              Only sections you modify will be sent to the device. Changed sections: {changedSections.length > 0 ? changedSections.join(', ') : 'none'}
            </div>
            {saveMessage && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                {saveMessage}
              </div>
            )}
          </div>
        </div>

        <SectionTabs
          sectionOrder={sectionOrder}
          activeSection={activeSection}
          sectionChangedMap={sectionChangedMap}
          editableSections={editableSections}
          onChange={setActiveSection}
        />

        {/* General */}
        <section
          id="general"
          className={`${activeSection === 'general' ? 'block' : 'hidden'} bg-white border border-gray-200 rounded-lg p-5 space-y-4`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ToggleLeft className="w-4 h-4 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">General</h2>
            </div>
            <Button
              onClick={() => {
                const updates = buildSectionUpdates('general')
                if (Object.keys(updates).length === 0) {
                  setSaveMessage('No changes to save')
                  return
                }
                openSaveConfirm(updates)
              }}
              disabled={!sectionChangedMap.general || saving || (editableSections.size > 0 && !editableSections.has('general'))}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save general
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Core device behavior: naming, GPS cadence, audio prompts, IR, standby, and basic unit metadata.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(config.general || {}).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label className="text-sm text-gray-700 capitalize">{key.replace(/_/g, ' ')}</Label>
                {typeof value === 'boolean' ? (
                  renderBooleanToggle(
                    `general-${key}`,
                    value,
                    (next) => updateGeneralField(key, next)
                  )
                ) : (
                  <Input
                    type={typeof value === 'number' ? 'number' : 'text'}
                    value={typeof value === 'number' || typeof value === 'string' ? value : ''}
                    onChange={(e) =>
                      updateGeneralField(
                        key,
                        typeof value === 'number' ? Number(e.target.value) : e.target.value
                      )
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Networks */}
        <section
          id="network"
          className={`${activeSection === 'network' ? 'block' : 'hidden'} bg-white border border-gray-200 rounded-lg p-5 space-y-4`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ToggleLeft className="w-4 h-4 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Networks</h2>
            </div>
            <Button
              onClick={() => {
                const updates = buildSectionUpdates('network')
                if (Object.keys(updates).length === 0) {
                  setSaveMessage('No changes to save')
                  return
                }
                openSaveConfirm(updates)
              }}
              disabled={!sectionChangedMap.network || saving || (editableSections.size > 0 && !editableSections.has('network'))}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save network
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Primary connectivity for the device: direct API endpoint, APN details, SIM pin, and Cathexis server.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['address', 'port', 'apn', 'apn_user', 'apn_passwd', 'simpin', 'cathexis_server'].map((field) => (
              <div key={field} className="space-y-2">
                <Label className="text-sm text-gray-700 capitalize">{field.replace(/_/g, ' ')}</Label>
                {field === 'apn_passwd' ? (
                  <div className="relative">
                    <Input
                      type={showApnPassword ? 'text' : 'password'}
                      className="pr-10"
                      value={config.network?.[field] ?? ''}
                      onChange={(e) => updateNetworkField(field, e.target.value)}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowApnPassword((v) => !v)}
                    >
                      {showApnPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                ) : (
                  <Input
                    type={field === 'port' ? 'number' : 'text'}
                    value={config.network?.[field] ?? ''}
                    onChange={(e) =>
                      updateNetworkField(
                        field,
                        field === 'port' ? Number(e.target.value) : e.target.value
                      )
                    }
                  />
                )}
              </div>
            ))}
            {['roaming', 'require_dapi_ack'].map((field) => (
              <div key={field} className="space-y-2">
                <Label className="text-sm text-gray-700 capitalize">{field.replace(/_/g, ' ')}</Label>
                {renderBooleanToggle(
                  `network-${field}`,
                  Boolean(config.network?.[field]),
                  (next) => updateNetworkField(field, next)
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-4 mt-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">SIP Configuration</h3>
            <p className="text-xs text-gray-600 mb-3">
              Optional SIP/VoIP settings for call handling.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['enable', 'domain', 'username', 'password', 'id', 'port'].map((field) => (
                <div key={field} className="space-y-2">
                  <Label className="text-sm text-gray-700 capitalize">{field.replace(/_/g, ' ')}</Label>
                  {field === 'enable' ? (
                    renderBooleanToggle(
                      `sip-${field}`,
                      Boolean(config.network?.sip_config?.[field]),
                      (next) => updateSipConfigField(field, next)
                    )
                  ) : (
                    <Input
                      type={field === 'port' ? 'number' : 'text'}
                      value={config.network?.sip_config?.[field] ?? ''}
                      onChange={(e) =>
                        updateSipConfigField(
                          field,
                          field === 'port' ? Number(e.target.value) : e.target.value
                        )
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">WiFi Networks</h3>
                <p className="text-xs text-gray-600">
                  Additional WiFi SSIDs the device can use when available.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={addExtraWifi}>
                Add network
              </Button>
            </div>
            {(config.network?.extra_wifi_configs?.extra_wifi || []).length === 0 && (
              <p className="text-sm text-gray-600">No additional WiFi networks configured.</p>
            )}
            <div className="space-y-3">
              {(config.network?.extra_wifi_configs?.extra_wifi || []).map((wifi: any, idx: number) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Network {idx + 1}</div>
                    <Button variant="ghost" size="sm" onClick={() => removeExtraWifi(idx)}>
                      Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-700">SSID</Label>
                      <Input
                        value={wifi.ssid ?? ''}
                        onChange={(e) => updateExtraWifiField(idx, 'ssid', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-700">Password</Label>
                      <div className="relative">
                        <Input
                          type={visibleWifiPasswords[idx] ? 'text' : 'password'}
                          className="pr-10"
                          value={wifi.password ?? ''}
                          onChange={(e) => updateExtraWifiField(idx, 'password', e.target.value)}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="absolute right-1 top-1/2 -translate-y-1/2"
                          onClick={() =>
                            setVisibleWifiPasswords((prev) => ({
                              ...prev,
                              [idx]: !prev[idx],
                            }))
                          }
                        >
                          {visibleWifiPasswords[idx] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-700">Type</Label>
                      <Input
                        type="number"
                        value={wifi.type ?? 0}
                        onChange={(e) => updateExtraWifiField(idx, 'type', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cameras */}
        <section
          id="cameras"
          className={`${activeSection === 'cameras' ? 'block' : 'hidden'} bg-white border border-gray-200 rounded-lg p-5 space-y-4`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ToggleLeft className="w-4 h-4 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Cameras</h2>
            </div>
            <Button
              onClick={() => {
                const updates = buildSectionUpdates('cameras')
                if (Object.keys(updates).length === 0) {
                  setSaveMessage('No changes to save')
                  return
                }
                openSaveConfirm(updates)
              }}
              disabled={!sectionChangedMap.cameras || saving || (editableSections.size > 0 && !editableSections.has('cameras'))}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save cameras
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Enable cameras and tune per-profile recording (bitrate, FPS, keyframe, audio, continuous/events).
          </p>

          {(config.cameras || []).map((camera: any, camIdx: number) => (
            <div key={camIdx} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">
                  {effectiveCapabilities.cameraOptions.find((option) => option.value === camIdx)?.label || `Camera ${camIdx}`}
                </div>
                {renderBooleanToggle(
                  `camera-${camIdx}-enabled`,
                  Boolean(camera.enabled),
                  (next) => updateCameraField(camIdx, 'enabled', next)
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(camera.profiles || []).map((profile: any, profileIdx: number) => (
                  <div key={profileIdx} className="border border-gray-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">
                        {effectiveCapabilities.profileOptions.find((option) => option.value === profileIdx)?.label || `Profile ${profileIdx}`}
                      </div>
                      {renderBooleanToggle(
                        `camera-${camIdx}-profile-${profileIdx}-enabled`,
                        Boolean(profile.enabled),
                        (next) => updateCameraProfileField(camIdx, profileIdx, 'enabled', next)
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {['fps', 'bitrate_bps', 'key_s', 'snapshot_period'].map((field) => (
                        <div key={field} className="space-y-1">
                          <Label className="text-xs text-gray-700 capitalize">{field.replace(/_/g, ' ')}</Label>
                          <Input
                            type="number"
                            value={profile[field] ?? ''}
                            onChange={(e) => updateCameraProfileField(camIdx, profileIdx, field, Number(e.target.value))}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {['audio', 'record_continuous', 'record_events'].map((field) => (
                        <div key={field} className="space-y-1">
                          <Label className="text-xs text-gray-700 capitalize">{field.replace(/_/g, ' ')}</Label>
                          {renderBooleanToggle(
                            `camera-${camIdx}-profile-${profileIdx}-${field}`,
                            Boolean(profile[field]),
                            (next) => updateCameraProfileField(camIdx, profileIdx, field, next)
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Face Recognition */}
        <section
          id="face_recognition"
          className={`${activeSection === 'face_recognition' ? 'block' : 'hidden'} bg-white border border-gray-200 rounded-lg p-5 space-y-4`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ToggleLeft className="w-4 h-4 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Face Recognition</h2>
            </div>
            <Button
              onClick={() => {
                const updates = buildSectionUpdates('face_recognition')
                if (Object.keys(updates).length === 0) {
                  setSaveMessage('No changes to save')
                  return
                }
                openSaveConfirm(updates)
              }}
              disabled={!sectionChangedMap.face_recognition || saving || (editableSections.size > 0 && !editableSections.has('face_recognition'))}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save face recognition
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Toggle face recognition and set the service endpoint and port.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-700">Enabled</Label>
              {renderBooleanToggle(
                "face-rec-enabled",
                Boolean(config.face_recognition?.enabled),
                (next) => updateFaceRecField('enabled', next)
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-700">Server</Label>
              <Input
                value={config.face_recognition?.server ?? ''}
                onChange={(e) => updateFaceRecField('server', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-700">Port</Label>
              <Input
                type="number"
                value={config.face_recognition?.port ?? ''}
                onChange={(e) => updateFaceRecField('port', Number(e.target.value))}
              />
            </div>
          </div>
        </section>

        {/* Event previews */}
        <section
          id="eventpreviews"
          className={`${activeSection === 'eventpreviews' ? 'block' : 'hidden'} bg-white border border-gray-200 rounded-lg p-5 space-y-4`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ToggleLeft className="w-4 h-4 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Event Previews</h2>
            </div>
            <Button
              onClick={() => {
                const updates = buildSectionUpdates('eventpreviews')
                if (Object.keys(updates).length === 0) {
                  setSaveMessage('No changes to save')
                  return
                }
                openSaveConfirm(updates)
              }}
              disabled={!sectionChangedMap.eventpreviews || saving || (editableSections.size > 0 && !editableSections.has('eventpreviews'))}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save event previews
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Choose which camera (road/cab) captures snapshots for each event type.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(config.eventpreviews || []).map((preview: any, index: number) => (
              <div key={preview.name || index} className="border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-semibold text-gray-900 mb-3 capitalize">{preview.name || `Preview ${index}`}</div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-700">{effectiveCapabilities.cameraOptions.find((option) => option.value === 0)?.label || 'Camera 0'}</Label>
                    {renderBooleanToggle(
                      `preview-${index}-road`,
                      Boolean(preview.road),
                      (next) => updateEventPreview(index, 'road', next)
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-700">{effectiveCapabilities.cameraOptions.find((option) => option.value === 1)?.label || 'Camera 1'}</Label>
                    {renderBooleanToggle(
                      `preview-${index}-cab`,
                      Boolean(preview.cab),
                      (next) => updateEventPreview(index, 'cab', next)
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Description */}
        <section
          id="description"
          className={`${activeSection === 'description' ? 'block' : 'hidden'} bg-white border border-gray-200 rounded-lg p-5 space-y-4`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ToggleLeft className="w-4 h-4 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Description</h2>
            </div>
            <Button
              onClick={() => {
                const updates = buildSectionUpdates('description')
                if (Object.keys(updates).length === 0) {
                  setSaveMessage('No changes to save')
                  return
                }
                openSaveConfirm(updates)
              }}
              disabled={!sectionChangedMap.description || saving || (editableSections.size > 0 && !editableSections.has('description'))}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save description
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Textual metadata about the device (site, org, dealer, firmware identifiers).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['registration', 'description', 'orgname', 'sitename', 'dealer_name', 'cathexis_serial', 'firmware_version'].map((field) => (
              <div key={field} className="space-y-2">
                <Label className="text-sm text-gray-700 capitalize">{field.replace(/_/g, ' ')}</Label>
                <Input
                  value={config.description?.[field] ?? ''}
                  onChange={(e) => updateDescriptionField(field, e.target.value)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Events note */}
        <section
          id="events"
          className={`${activeSection === 'events' ? 'block' : 'hidden'} bg-white border border-gray-200 rounded-lg p-5 space-y-4`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ToggleLeft className="w-4 h-4 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Events</h2>
            </div>
            <Button
              onClick={() => {
                const updates = buildSectionUpdates('events')
                if (Object.keys(updates).length === 0) {
                  setSaveMessage('No changes to save')
                  return
                }
                openSaveConfirm(updates)
              }}
              disabled={!sectionChangedMap.events || saving || (editableSections.size > 0 && !editableSections.has('events'))}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save events
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-700">
            Raw JSON editor for event rules. This supports models with different event schemas.
          </p>
          <textarea
            key={`events-${JSON.stringify(initialConfig?.events || {})}`}
            className="w-full min-h-64 rounded-md border border-gray-300 p-3 text-xs font-mono"
            defaultValue={JSON.stringify(config.events ?? {}, null, 2)}
            onBlur={(e) => {
              try {
                const next = JSON.parse(e.target.value || '{}')
                setConfig((prev: any) => ({ ...prev, events: next }))
                setSaveMessage(null)
              } catch {
                setSaveMessage('Events JSON is invalid. Fix JSON syntax before saving.')
              }
            }}
            disabled={editableSections.size > 0 && !editableSections.has('events')}
          />
        </section>

        {sectionOrder
          .filter((section) => !defaultSectionOrder.includes(section as any))
          .map((section) => (
            <section
              key={section}
              id={section}
              className={`${activeSection === section ? 'block' : 'hidden'} bg-white border border-gray-200 rounded-lg p-5 space-y-4`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ToggleLeft className="w-4 h-4 text-gray-700" />
                  <h2 className="text-lg font-semibold text-gray-900">{section.replace(/_/g, ' ')}</h2>
                </div>
                <Button
                  onClick={() => {
                    const updates = buildSectionUpdates(section)
                    if (Object.keys(updates).length === 0) {
                      setSaveMessage('No changes to save')
                      return
                    }
                    openSaveConfirm(updates)
                  }}
                  disabled={!sectionChangedMap[section] || saving || (editableSections.size > 0 && !editableSections.has(section))}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save {section.replace(/_/g, ' ')}
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-700">
                Raw JSON editor for model-specific fields. Use valid JSON format.
              </p>
              <textarea
                key={`${section}-${JSON.stringify(initialConfig?.[section] || {})}`}
                className="w-full min-h-64 rounded-md border border-gray-300 p-3 text-xs font-mono"
                defaultValue={JSON.stringify(config?.[section] ?? {}, null, 2)}
                onBlur={(e) => {
                  try {
                    const next = JSON.parse(e.target.value || '{}')
                    setConfig((prev: any) => ({ ...prev, [section]: next }))
                    setSaveMessage(null)
                  } catch {
                    setSaveMessage(`${section} JSON is invalid. Fix JSON syntax before saving.`)
                  }
                }}
                disabled={editableSections.size > 0 && !editableSections.has(section)}
              />
            </section>
          ))}
      

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply configuration and reboot?</AlertDialogTitle>
            <AlertDialogDescription>
              The device will reboot immediately after saving. Review the sections below before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-3 space-y-2">
            {Object.keys(pendingUpdates || {}).length === 0 ? (
              <p className="text-sm text-gray-600">No changes detected.</p>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">Sections to update:</p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                  {Object.entries(pendingUpdates).map(([section, value]) => (
                    <li key={section}>
                      {section.replace(/_/g, ' ')} (
                        {Array.isArray(value)
                          ? value.length
                          : typeof value === 'object' && value !== null
                            ? Object.keys(value || {}).length
                            : 1
                        } fields)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleSave(pendingUpdates)
              }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save and reboot'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfigShell>
  )
}

