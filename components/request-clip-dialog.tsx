"use client"

import { useState, useEffect } from "react"
import { Film, Loader2, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getCapabilitiesForUnit, normalizeProtocol } from "@/lib/units/registry"
import type { UnitCapabilities } from "@/lib/units/types"

// Format a Date into the value a <input type="datetime-local"> expects (local wall-clock).
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

interface Region {
  start_utc: number
  end_utc: number
}

/** Raw file entry from Howen query_recordings (0x4060) — see docs/HOWEN_API.md §5. */
interface HowenRecordingFile {
  st?: string
  et?: string
  fn?: string
  ft?: string
  si?: string
  chl?: string
  fs?: string
}

// Map a Howen file-query entry to a playback region (Unix epoch seconds).
//
// Prefer the `st`/`et` UTC wall-clock strings: they are the device's canonical
// recording index and are what playback-by-time (0x4070) matches against.
//
// Do NOT trust the epochs embedded in the filename (`fn`). On this device they are
// offset by the unit's local timezone (e.g. +2h for SAST) relative to `st`/`et` —
// the firmware stamps the filename epoch from local wall-clock as if it were UTC.
// Using them makes playback request a window 2h past the real file → err=6
// ("related file does not exist").
function howenFileToRegion(file: HowenRecordingFile): Region | null {
  if (file.st && file.et) {
    const start_utc = Math.floor(new Date(file.st.replace(" ", "T") + "Z").getTime() / 1000)
    const end_utc = Math.floor(new Date(file.et.replace(" ", "T") + "Z").getTime() / 1000)
    if (Number.isFinite(start_utc) && Number.isFinite(end_utc) && end_utc > start_utc) {
      return { start_utc, end_utc }
    }
  }
  // Fallback only when the device omits st/et — filename epochs may be tz-offset.
  const fn = file.fn || ""
  const epochMatch = fn.match(/_(\d{10})_(\d{10})_/)
  if (epochMatch) {
    const start_utc = Number(epochMatch[1])
    const end_utc = Number(epochMatch[2])
    if (Number.isFinite(start_utc) && Number.isFinite(end_utc) && end_utc > start_utc) {
      return { start_utc, end_utc }
    }
  }
  return null
}

interface RingSummaryResponse {
  ok: boolean
  serial: string
  command_type: string
  error?: string
  data: {
    camera: number
    dto: number
    ring: {
      profiles: Array<{
        profile: number
        regions?: Region[]
      }>
    }
  }
  receivedAt: string
}

interface RequestClipDialogProps {
  serial: string
  deviceModel?: string | null
  protocol?: string | null
  capabilities?: UnitCapabilities
  onClipRequested?: () => void
}

export function RequestClipDialog({
  serial,
  deviceModel = null,
  protocol = null,
  capabilities,
  onClipRequested,
}: RequestClipDialogProps) {
  const unitCapabilities = capabilities || getCapabilitiesForUnit({
    serial,
    deviceModel,
    protocol: normalizeProtocol(protocol),
  })
  const cameraOptions = unitCapabilities.cameraOptions
  const profileOptions = unitCapabilities.profileOptions

  // Howen units have no ring-summary; instead we query the on-device recording timeline
  // (query_recordings / 0x4060) over a search window, then let the operator pick a segment.
  // See docs/HOWEN_API.md §4.3 / §5.
  const isHowen = unitCapabilities.protocol === 'howen'

  const defaultCamera = cameraOptions[0]?.value ?? 0
  const defaultProfile = profileOptions[0]?.value ?? 0

  const [open, setOpen] = useState(false)
  const [camera, setCamera] = useState<number>(defaultCamera)
  const [profile, setProfile] = useState<number>(defaultProfile)
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [loadingRegions, setLoadingRegions] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState<'select' | 'regions' | 'timerange'>('select')

  // Howen recording-timeline search window (the device timeline query needs a bounded range).
  const [searchStartLocal, setSearchStartLocal] = useState<string>("")
  const [searchEndLocal, setSearchEndLocal] = useState<string>("")

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setStep('select')
      setRegions([])
      setSelectedRegion(null)
      setStartTime(null)
      setEndTime(null)
      setError(null)
      setSuccess(false)
      // Default the Howen search window to the last 24 hours (local time).
      const now = new Date()
      now.setSeconds(0, 0)
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      setSearchStartLocal(toLocalInputValue(dayAgo))
      setSearchEndLocal(toLocalInputValue(now))
    }
  }, [open])

  useEffect(() => {
    if (!cameraOptions.some((option) => option.value === camera)) {
      setCamera(defaultCamera)
    }
    if (!profileOptions.some((option) => option.value === profile)) {
      setProfile(defaultProfile)
    }
  }, [camera, profile, cameraOptions, profileOptions, defaultCamera, defaultProfile])

  async function fetchRingSummary() {
    if (!cameraOptions.some((option) => option.value === camera)) {
      setError('Selected camera is not available for this unit')
      return
    }

    if (!profileOptions.some((option) => option.value === profile)) {
      setError('Selected profile is not available for this unit')
      return
    }

    try {
      setLoadingRegions(true)
      setError(null)
      console.log("DEBUG::RequestClipDialog", "Fetching ring summary for:", { serial, camera, profile })

      const response = await fetch('/api/ring-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serial,
          camera,
          profile,
          capabilities: {
            cameraOptions,
            profileOptions,
          },
          protocol,
          deviceModel,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch available footage')
      }

      const data: RingSummaryResponse = await response.json()
      console.log("DEBUG::RequestClipDialog", "Ring summary response:", data)

      if (!data.ok) {
        throw new Error(data.error || 'Device returned an error')
      }

      // Find the profile data
      const profileData = data.data.ring.profiles.find(p => p.profile === profile)
      const fetchedRegions = profileData?.regions || []
      
      console.log("DEBUG::RequestClipDialog", `Found ${fetchedRegions.length} regions`)
      setRegions(fetchedRegions)
      
      if (fetchedRegions.length === 0) {
        setError('No footage available for selected camera and profile')
      } else {
        setStep('regions')
      }
    } catch (err: any) {
      console.log("DEBUG::RequestClipDialog", "Error fetching ring summary:", err)
      setError(err.message || 'Failed to fetch available footage')
    } finally {
      setLoadingRegions(false)
    }
  }

  async function fetchHowenRecordings() {
    if (!cameraOptions.some((option) => option.value === camera)) {
      setError('Selected camera is not available for this unit')
      return
    }

    if (!profileOptions.some((option) => option.value === profile)) {
      setError('Selected profile is not available for this unit')
      return
    }

    const searchStartUtc = searchStartLocal ? Math.floor(new Date(searchStartLocal).getTime() / 1000) : NaN
    const searchEndUtc = searchEndLocal ? Math.floor(new Date(searchEndLocal).getTime() / 1000) : NaN

    if (!Number.isFinite(searchStartUtc) || !Number.isFinite(searchEndUtc)) {
      setError('Select a valid search start and end date/time')
      return
    }

    if (searchEndUtc <= searchStartUtc) {
      setError('Search end must be after the search start')
      return
    }

    try {
      setLoadingRegions(true)
      setError(null)

      console.log("DEBUG::RequestClipDialog", "Fetching Howen query_recordings for:", { serial, camera, profile, searchStartUtc, searchEndUtc })

      const response = await fetch(`/api/units/${encodeURIComponent(serial)}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'query_recordings',
          payload: {
            camera,
            profile,
            start_utc: searchStartUtc,
            end_utc: searchEndUtc,
            file_type: 1,
          },
        }),
        cache: 'no-store',
      })

      const data = await response.json().catch(() => null)
      console.log("DEBUG::RequestClipDialog", "Howen query_recordings response:", data)

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `Failed to fetch available footage (${response.status})`)
      }

      // Gateway returns files under data.files (not a normalized recordings[] list).
      const files: HowenRecordingFile[] = Array.isArray(data?.data?.files) ? data.data.files : []
      const expectedChannel = String(camera + 1)
      const expectedStreamIndex = profile === 0 ? '1' : '0'

      const fetchedRegions: Region[] = files
        .filter((file) => {
          if (file.chl && file.chl !== expectedChannel) return false
          if (file.si && file.si !== expectedStreamIndex) return false
          return true
        })
        .map(howenFileToRegion)
        .filter((region): region is Region => region !== null)
        .sort((a, b) => a.start_utc - b.start_utc)

      console.log("DEBUG::RequestClipDialog", `Found ${fetchedRegions.length} Howen recording segments from ${files.length} files`)
      setRegions(fetchedRegions)

      if (fetchedRegions.length === 0) {
        setError(
          files.length > 0
            ? `Found ${files.length} file(s) on device but none match this camera/profile. Try another profile or widen the search window.`
            : 'No footage found in this window. Try widening the search range.'
        )
      } else {
        setStep('regions')
      }
    } catch (err: any) {
      console.log("DEBUG::RequestClipDialog", "Error fetching Howen recordings:", err)
      setError(err.message || 'Failed to fetch available footage')
    } finally {
      setLoadingRegions(false)
    }
  }

  async function requestClip() {
    if (!startTime || !endTime) {
      setError('Please select start and end times')
      return
    }

    const duration = endTime - startTime
    if (duration < 5) {
      setError('Clip duration must be at least 5 seconds')
      return
    }
    if (duration > 300) {
      setError('Clip duration cannot exceed 5 minutes (300 seconds)')
      return
    }

    try {
      setRequesting(true)
      setError(null)
      console.log("DEBUG::RequestClipDialog", "Requesting clip:", { 
        serial, 
        camera, 
        profile, 
        start_utc: startTime, 
        end_utc: endTime,
        duration 
      })

      const response = await fetch('/api/clips/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serial,
          camera,
          profile,
          start_utc: startTime,
          end_utc: endTime,
          capabilities: {
            cameraOptions,
            profileOptions,
          },
          protocol,
          deviceModel,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to request clip')
      }

      const data = await response.json()
      console.log("DEBUG::RequestClipDialog", "Clip request response:", data)

      if (!data.ok) {
        throw new Error(data.error || 'Device returned an error')
      }

      // Show success message
      setSuccess(true)
      setError(null)

      // Close dialog after 2 seconds and notify parent
      setTimeout(() => {
        setOpen(false)
        if (onClipRequested) {
          onClipRequested()
        }
      }, 2000)
    } catch (err: any) {
      console.log("DEBUG::RequestClipDialog", "Error requesting clip:", err)
      setError(err.message || 'Failed to request clip')
    } finally {
      setRequesting(false)
    }
  }

  function formatDateTime(utc: number): string {
    return new Date(utc * 1000).toLocaleString()
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`
    } else if (mins > 0) {
      return `${mins}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  function selectRegion(region: Region) {
    setSelectedRegion(region)
    setStartTime(region.start_utc)
    setEndTime(Math.min(region.start_utc + 300, region.end_utc)) // Default to 5 min or region end
    setStep('timerange')
  }

  function adjustTime(type: 'start' | 'end', adjustment: number) {
    if (!selectedRegion) return

    if (type === 'start') {
      const newStart = Math.max(
        selectedRegion.start_utc,
        Math.min((startTime || selectedRegion.start_utc) + adjustment, (endTime || selectedRegion.end_utc) - 5)
      )
      setStartTime(newStart)
    } else {
      const newEnd = Math.min(
        selectedRegion.end_utc,
        Math.max((endTime || selectedRegion.end_utc) + adjustment, (startTime || selectedRegion.start_utc) + 5)
      )
      setEndTime(newEnd)
      
      // Check if duration exceeds 5 minutes
      if (startTime && newEnd - startTime > 300) {
        setEndTime(startTime + 300)
      }
    }
  }

  const currentDuration = startTime && endTime ? endTime - startTime : 0
  const isDurationValid = currentDuration >= 5 && currentDuration <= 300

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Film className="w-4 h-4 mr-2" />
          Request New Clip
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Request Clip from Device</DialogTitle>
          <DialogDescription>
            {isHowen
              ? "Select a camera, profile, and the date/time window to pull footage from the device."
              : "Select camera, profile, and time range to download footage from the device."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Camera and Profile Selection */}
          {step === 'select' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="camera">Camera</Label>
                <Select value={camera.toString()} onValueChange={(v) => setCamera(parseInt(v))}>
                  <SelectTrigger id="camera">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cameraOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile">Quality Profile</Label>
                <Select value={profile.toString()} onValueChange={(v) => setProfile(parseInt(v))}>
                  <SelectTrigger id="profile">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {profileOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Howen: search the on-device recording timeline over a bounded window */}
              {isHowen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="howen-search-start">Search from</Label>
                    <Input
                      id="howen-search-start"
                      type="datetime-local"
                      step={1}
                      value={searchStartLocal}
                      onChange={(e) => setSearchStartLocal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="howen-search-end">Search to</Label>
                    <Input
                      id="howen-search-end"
                      type="datetime-local"
                      step={1}
                      value={searchEndLocal}
                      onChange={(e) => setSearchEndLocal(e.target.value)}
                    />
                  </div>
                  <p className="sm:col-span-2 text-xs text-gray-500">
                    Your local time. We&apos;ll list the footage the device has recorded in this window.
                  </p>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                  {error}
                </div>
              )}

              <Button 
                onClick={isHowen ? fetchHowenRecordings : fetchRingSummary} 
                disabled={loadingRegions}
                className="w-full"
              >
                {loadingRegions ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Fetching Available Footage...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Check Available Footage
                  </>
                )}
              </Button>
            </>
          )}

          {/* Step 2: Region Selection */}
          {step === 'regions' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Available Footage Periods</h3>
                <Button variant="ghost" size="sm" onClick={() => setStep('select')}>
                  Change Camera/Profile
                </Button>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {regions.map((region, index) => {
                  const duration = region.end_utc - region.start_utc
                  return (
                    <button
                      key={index}
                      onClick={() => selectRegion(region)}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            Period {index + 1}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                            <div>Start: {formatDateTime(region.start_utc)}</div>
                            <div>End: {formatDateTime(region.end_utc)}</div>
                          </div>
                        </div>
                        <div className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          {formatDuration(duration)}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Step 3: Time Range Selection */}
          {step === 'timerange' && selectedRegion && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Select Time Range</h3>
                <Button variant="ghost" size="sm" onClick={() => setStep('regions')}>
                  Back to Periods
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                <div className="font-medium mb-1">Selected Period:</div>
                <div>{formatDateTime(selectedRegion.start_utc)} - {formatDateTime(selectedRegion.end_utc)}</div>
                <div className="mt-1">Duration: {formatDuration(selectedRegion.end_utc - selectedRegion.start_utc)}</div>
              </div>

              <div className="space-y-4">
                {/* Start Time */}
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => adjustTime('start', -30)}
                      disabled={startTime === selectedRegion.start_utc}
                    >
                      -30s
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => adjustTime('start', -5)}
                      disabled={startTime === selectedRegion.start_utc}
                    >
                      -5s
                    </Button>
                    <div className="flex-1 text-center text-sm font-mono bg-gray-50 p-2 rounded border">
                      {startTime ? formatDateTime(startTime) : '-'}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => adjustTime('start', 5)}
                      disabled={!endTime || startTime! >= endTime - 5}
                    >
                      +5s
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => adjustTime('start', 30)}
                      disabled={!endTime || startTime! >= endTime - 5}
                    >
                      +30s
                    </Button>
                  </div>
                </div>

                {/* End Time */}
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => adjustTime('end', -30)}
                      disabled={!startTime || endTime! <= startTime + 5}
                    >
                      -30s
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => adjustTime('end', -5)}
                      disabled={!startTime || endTime! <= startTime + 5}
                    >
                      -5s
                    </Button>
                    <div className="flex-1 text-center text-sm font-mono bg-gray-50 p-2 rounded border">
                      {endTime ? formatDateTime(endTime) : '-'}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adjustTime('end', 5)}
                      disabled={endTime === selectedRegion.end_utc || Boolean(startTime && endTime! - startTime >= 300)}
                    >
                      +5s
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adjustTime('end', 30)}
                      disabled={endTime === selectedRegion.end_utc || Boolean(startTime && endTime! - startTime >= 300)}
                    >
                      +30s
                    </Button>
                  </div>
                </div>

                {/* Duration Display */}
                <div className={`p-3 rounded border ${
                  isDurationValid 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className="text-sm font-medium">
                    Selected Duration: {formatDuration(currentDuration)}
                  </div>
                  <div className="text-xs mt-1 text-gray-600">
                    {currentDuration < 5 && 'Minimum 5 seconds required'}
                    {currentDuration > 300 && 'Maximum 5 minutes (300 seconds) allowed'}
                    {isDurationValid && 'Duration is valid'}
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">
                  <div className="font-medium">✓ Clip request sent successfully!</div>
                  <div className="mt-1 text-xs">The clip will appear in the list and you can monitor its progress in real-time.</div>
                </div>
              )}

              <Button 
                onClick={requestClip}
                disabled={!isDurationValid || requesting || success}
                className="w-full"
              >
                {requesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Requesting Clip...
                  </>
                ) : success ? (
                  <>
                    ✓ Request Sent
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4 mr-2" />
                    Request Clip
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

