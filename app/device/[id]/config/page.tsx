"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save, RefreshCw, Settings, ToggleLeft, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
import { DeviceBreadcrumb } from "@/components/device-breadcrumb"
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

interface Device {
  id: number
  friendly_name: string | null
  serial: string | null
}

interface DeviceConfigResponse {
  ok: boolean
  data?: any
  error?: string
}

const sectionOrder = [
  'general',
  'network',
  'cameras',
  'face_recognition',
  'eventpreviews',
  'description',
  'events',
] as const

type SectionKey = typeof sectionOrder[number]

export default function DeviceConfigPage() {
  const params = useParams()
  const router = useRouter()
  const deviceId = params.id as string

  const [device, setDevice] = useState<Device | null>(null)
  const [config, setConfig] = useState<any | null>(null)
  const [initialConfig, setInitialConfig] = useState<any | null>(null)
  const [loadingDevice, setLoadingDevice] = useState(true)
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showApnPassword, setShowApnPassword] = useState(false)
  const [visibleWifiPasswords, setVisibleWifiPasswords] = useState<Record<number, boolean>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, any>>({})

  useEffect(() => {
    fetchDevice()
  }, [deviceId])

  async function fetchDevice() {
    try {
      setLoadingDevice(true)
      console.log("DEBUG::DeviceConfigPage", { action: "fetchDevice", deviceId })

      const { data, error: dbError } = await supabase
        .from('device')
        .select('id, friendly_name, serial')
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
      }

      setDevice(mapped)

      if (mapped.serial) {
        await fetchConfig(mapped.serial)
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

  async function fetchConfig(serial: string) {
    try {
      setLoadingConfig(true)
      setError(null)
      console.log("DEBUG::DeviceConfigPage", { action: "fetchConfig", serial })

      const response = await fetch(`/api/device-config?serial=${encodeURIComponent(serial)}`)
      const data: DeviceConfigResponse = await response.json()

      if (!data.ok) {
        throw new Error(data.error || 'Failed to load config from device')
      }

      const payload = data.data
      setConfig(payload)
      setInitialConfig(payload)
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

  const changedSections = useMemo(() => {
    if (!config || !initialConfig) return []
    return sectionOrder.filter((key) => !deepEqual(config[key], initialConfig[key]))
  }, [config, initialConfig])

  const hasChanges = changedSections.length > 0

  function buildUpdates(): Record<string, any> {
    const updates: Record<string, any> = {}
    sectionOrder.forEach((key) => {
      if (!deepEqual(config?.[key], initialConfig?.[key])) {
        updates[key] = config?.[key]
      }
    })
    return updates
  }

  async function handleSave(updatesOverride?: Record<string, any>) {
    if (!device?.serial || !config || !initialConfig) return
    const updates = updatesOverride || buildUpdates()

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
          updates,
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

  function openSaveConfirm() {
    const updates = buildUpdates()
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

  if (error || !device || !config) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="w-full max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-700" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Device Configuration
              </h1>
              <p className="text-sm text-gray-600 truncate">
                {device.friendly_name || 'Unnamed Device'} • {device.serial || 'No serial'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetChanges}
              disabled={!hasChanges || saving}
              className="w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={openSaveConfirm} disabled={!hasChanges || saving} className="w-full sm:w-auto">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="bg-white border-b border-gray-200">
        <div className="w-full max-w-7xl mx-auto px-4 py-3">
          <DeviceBreadcrumb
            items={[
              { label: "Devices", href: "/" },
              { label: device.friendly_name || "Device", href: `/device/${device.id}` },
              { label: "Configuration" },
            ]}
          />
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
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

        {/* Quick links */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-2 text-sm">
          {sectionOrder.map((key) => (
            <a
              key={key}
              href={`#${key}`}
              className="px-3 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {key.replace(/_/g, ' ')}
            </a>
          ))}
        </div>

        {/* General */}
        <section id="general" className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ToggleLeft className="w-4 h-4 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">General</h2>
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
        <section id="network" className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ToggleLeft className="w-4 h-4 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Networks</h2>
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
        <section id="cameras" className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ToggleLeft className="w-4 h-4 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Cameras</h2>
          </div>
          <p className="text-sm text-gray-600">
            Enable cameras and tune per-profile recording (bitrate, FPS, keyframe, audio, continuous/events).
          </p>

          {(config.cameras || []).map((camera: any, camIdx: number) => (
            <div key={camIdx} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">
                  Camera {camIdx} {camIdx === 0 ? '(Road)' : '(Cab)'}
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
                        {profileIdx === 0
                          ? 'High Definition (1080p/720p)'
                          : 'Low Definition (360p)'} (Profile {profileIdx})
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
        <section id="face_recognition" className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ToggleLeft className="w-4 h-4 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Face Recognition</h2>
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
        <section id="eventpreviews" className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ToggleLeft className="w-4 h-4 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Event Previews</h2>
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
                    <Label className="text-xs text-gray-700">Road camera (Camera 0)</Label>
                    {renderBooleanToggle(
                      `preview-${index}-road`,
                      Boolean(preview.road),
                      (next) => updateEventPreview(index, 'road', next)
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-700">Cab camera (Camera 1)</Label>
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
        <section id="description" className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ToggleLeft className="w-4 h-4 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Description</h2>
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
        <section id="events" className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ToggleLeft className="w-4 h-4 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Events</h2>
          </div>
          <p className="text-sm text-gray-700">
            Event rules are loaded with the configuration. Edit support for every event parameter is coming soon. For now, no event changes will be sent unless you adjust other sections.
          </p>
        </section>
      </div>

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
                      {section.replace(/_/g, ' ')} ({typeof value === 'object' ? Object.keys(value || {}).length : 1} fields)
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
    </div>
  )
}

