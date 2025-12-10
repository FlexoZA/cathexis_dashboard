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
import { Label } from "@/components/ui/label"

interface Region {
  start_utc: number
  end_utc: number
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
  onClipRequested?: () => void
}

const cameraOptions = [
  { value: 0, label: 'Road Camera' },
  { value: 1, label: 'Driver Camera' }
]

const profileOptions = [
  { value: 0, label: 'High Resolution' },
  { value: 1, label: 'Low Resolution' }
]

export function RequestClipDialog({ serial, onClipRequested }: RequestClipDialogProps) {
  const [open, setOpen] = useState(false)
  const [camera, setCamera] = useState<number>(0)
  const [profile, setProfile] = useState<number>(0)
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [loadingRegions, setLoadingRegions] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState<'select' | 'regions' | 'timerange'>('select')

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
    }
  }, [open])

  async function fetchRingSummary() {
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
          profile
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
          end_utc: endTime
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
            Select camera, profile, and time range to download footage from the device.
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

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                  {error}
                </div>
              )}

              <Button 
                onClick={fetchRingSummary} 
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

