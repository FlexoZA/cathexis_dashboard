"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Settings, Activity, MapPin, Film, Download, Trash2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { RequestClipDialog } from "@/components/request-clip-dialog"
import { VideoPlayerDialog } from "@/components/video-player-dialog"
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
  device_model: string | null
  status: 'online' | 'offline' | 'warning' | 'maintenance' | null
  created_at: string
  client_id: number | null
  group_id: number | null
  groups?: {
    name: string
  } | null
}

interface Clip {
  id: number
  serial: string
  camera: number
  profile: number
  start_utc: number
  end_utc: number
  duration_seconds: number
  file_size: number
  storage_path: string
  signed_url: string | null
  signed_url_expires_at: string | null
  created_at: string
  status: string
  progress_percent: number
  bytes_received: number
  error_message: string | null
}

const statusConfig = {
  online: { label: 'Online', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  offline: { label: 'Offline', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  warning: { label: 'Warning', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  maintenance: { label: 'Maintenance', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
}

const clipStatusConfig = {
  receiving: { label: 'Receiving', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  ready: { label: 'Ready', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
}

const cameraNames = {
  0: 'Road',
  1: 'Cab'
}

const profileNames = {
  0: 'High Res',
  1: 'Low Res'
}

export default function DevicePage() {
  const params = useParams()
  const router = useRouter()
  const [device, setDevice] = useState<Device | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [loading, setLoading] = useState(true)
  const [clipsLoading, setClipsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clipToDelete, setClipToDelete] = useState<Clip | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [clipToPlay, setClipToPlay] = useState<Clip | null>(null)
  const [playerOpen, setPlayerOpen] = useState(false)
  const [downloadingClipId, setDownloadingClipId] = useState<number | null>(null)

  const deviceId = params.id as string

  useEffect(() => {
    fetchDevice()
  }, [deviceId])

  useEffect(() => {
    // Set up real-time subscription for clips updates
    if (!device?.serial) return

    console.log("DEBUG::DevicePage", "Setting up real-time subscription for clips")
    
    const channel = supabase
      .channel('clips-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clips',
          filter: `serial=eq.${device.serial}`
        },
        (payload) => {
          try {
            console.log("DEBUG::DevicePage", "Real-time clip update:", payload)

            if (payload.eventType === 'INSERT') {
              // New clip added
              setClips(prev => [payload.new as Clip, ...prev])
            } else if (payload.eventType === 'UPDATE') {
              // Clip updated (progress, status, etc.)
              setClips(prev => prev.map(clip =>
                clip.id === payload.new.id ? payload.new as Clip : clip
              ))
            } else if (payload.eventType === 'DELETE') {
              // Clip deleted
              setClips(prev => prev.filter(clip => clip.id !== payload.old.id))
            }
          } catch (error) {
            console.error("DEBUG::DevicePage", "Error handling real-time clip update:", error, payload)
          }
        }
      )
      .subscribe()

    return () => {
      console.log("DEBUG::DevicePage", "Cleaning up real-time subscription")
      supabase.removeChannel(channel)
    }
  }, [device?.serial])

  async function fetchDevice() {
    try {
      setLoading(true)
      console.log("DEBUG::DevicePage", "Fetching device:", deviceId)

      const { data, error } = await supabase
        .from('device')
        .select(`
          *,
          groups (
            name
          )
        `)
        .eq('id', parseInt(deviceId))
        .single()

      console.log("DEBUG::DevicePage", "Supabase response:", { data, error })

      if (error) {
        console.log("DEBUG::DevicePage", "Error fetching device:", error)
        throw error
      }

      if (!data) {
        throw new Error('Device not found')
      }

      console.log("DEBUG::DevicePage", "Device data:", data)
      setDevice(data)
      
      // Fetch clips after we have the device serial
      const deviceData = data as Device
      if (deviceData.serial) {
        fetchClips(deviceData.serial)
      } else {
        setClipsLoading(false)
      }
    } catch (err: any) {
      console.log("DEBUG::DevicePage", "Catch block error:", err)
      setError(err.message || 'Failed to fetch device')
      setClipsLoading(false)
    } finally {
      setLoading(false)
    }
  }

  async function fetchClips(serial: string) {
    try {
      setClipsLoading(true)
      console.log("DEBUG::DevicePage", "Fetching clips for serial:", serial)

      const { data, error } = await supabase
        .from('clips')
        .select('*')
        .eq('serial', serial)
        .order('created_at', { ascending: false })

      if (error) {
        console.log("DEBUG::DevicePage", "Error fetching clips:", error)
        throw error
      }

      console.log("DEBUG::DevicePage", `Found ${data?.length || 0} clips`)
      setClips(data || [])
    } catch (err: any) {
      console.log("DEBUG::DevicePage", "Error fetching clips:", err)
    } finally {
      setClipsLoading(false)
    }
  }

  async function downloadClip(clip: Clip) {
    try {
      setDownloadingClipId(clip.id)
      console.log("DEBUG::DevicePage", "Downloading clip:", clip.id)
      
      let downloadUrl: string | null = null

      // If we have a valid signed URL that hasn't expired, use it
      if (clip.signed_url && clip.signed_url_expires_at) {
        const expiresAt = new Date(clip.signed_url_expires_at)
        if (expiresAt > new Date()) {
          console.log("DEBUG::DevicePage", "Using existing signed URL")
          downloadUrl = clip.signed_url
        }
      }

      // Otherwise, generate a new signed URL
      if (!downloadUrl) {
        console.log("DEBUG::DevicePage", "Generating new signed URL for:", clip.storage_path)
        const { data, error } = await supabase.storage
          .from('clips')
          .createSignedUrl(clip.storage_path, 3600) // 1 hour expiry

        if (error) {
          console.log("DEBUG::DevicePage", "Error generating signed URL:", error)
          throw error
        }

        if (!data?.signedUrl) {
          throw new Error('Failed to generate signed URL')
        }

        downloadUrl = data.signedUrl
      }

      // Create filename from clip metadata
      const date = new Date(clip.start_utc * 1000)
      const dateStr = date.toISOString().replace(/[:.]/g, '-').slice(0, -5) // Format: YYYY-MM-DDTHH-MM-SS
      const filename = `${clip.serial}_${cameraNames[clip.camera as 0 | 1].toLowerCase()}_${dateStr}.mp4`

      // Fetch the file as a blob (required for cross-origin downloads)
      console.log("DEBUG::DevicePage", "Fetching file as blob...")
      const response = await fetch(downloadUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch file')
      }
      
      const blob = await response.blob()
      console.log("DEBUG::DevicePage", "Blob received, size:", blob.size)

      // Create object URL and download
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
      
      console.log("DEBUG::DevicePage", "Download initiated for:", filename)
    } catch (err: any) {
      console.log("DEBUG::DevicePage", "Error downloading clip:", err)
      alert('Failed to download clip: ' + err.message)
    } finally {
      setDownloadingClipId(null)
    }
  }

  async function deleteClip() {
    if (!clipToDelete) return

    try {
      setDeleting(true)
      console.log("DEBUG::DevicePage", "Deleting clip:", clipToDelete.id)

      // First, delete from storage
      console.log("DEBUG::DevicePage", "Deleting from storage:", clipToDelete.storage_path)
      const { error: storageError } = await supabase.storage
        .from('clips')
        .remove([clipToDelete.storage_path])

      if (storageError) {
        console.log("DEBUG::DevicePage", "Error deleting from storage:", storageError)
        // Continue anyway as the file might not exist
      }

      // Then, delete from database
      console.log("DEBUG::DevicePage", "Deleting from database")
      const { error: dbError } = await supabase
        .from('clips')
        .delete()
        .eq('id', clipToDelete.id)

      if (dbError) {
        console.log("DEBUG::DevicePage", "Error deleting from database:", dbError)
        throw dbError
      }

      console.log("DEBUG::DevicePage", "Clip deleted successfully")
      
      // Immediately update local state (real-time will also update, but this is instant)
      setClips(prev => prev.filter(clip => clip.id !== clipToDelete.id))
      
      // Close dialog
      setClipToDelete(null)
    } catch (err: any) {
      console.log("DEBUG::DevicePage", "Error deleting clip:", err)
      alert('Failed to delete clip: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString()
  }

  function formatUtcTimestamp(utc: number): string {
    return new Date(utc * 1000).toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 py-12">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading device...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !device) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 py-12">
          <div className="text-center py-12">
            <p className="text-destructive">{error || 'Device not found'}</p>
            <Button
              onClick={() => router.push('/')}
              className="mt-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Devices
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {device.friendly_name || 'Unnamed Device'}
              </h1>
              <p className="text-sm text-gray-600">
                Device #{device.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href={`/device/${device.id}/config`}>
                <Settings className="w-4 h-4 mr-2" />
                Device Config
              </Link>
            </Button>
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full border ${
                statusConfig[device.status || 'offline'].color
              }`}
            >
              {statusConfig[device.status || 'offline'].label}
            </span>
          </div>
        </div>
      </div>
      <div className="bg-white border-b border-gray-200">
        <div className="w-full max-w-7xl mx-auto px-4 py-3">
          <DeviceBreadcrumb
            items={[
              { label: "Devices", href: "/" },
              { label: device.friendly_name || "Device" },
            ]}
          />
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Device Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Friendly Name</label>
                <p className="text-sm text-gray-900 mt-1">
                  {device.friendly_name || 'Not set'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Serial Number</label>
                <p className="text-sm font-mono text-gray-900 mt-1">
                  {device.serial || 'Not available'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Device Model</label>
                <p className="text-sm text-gray-900 mt-1">
                  {device.device_model || 'Unknown'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Group</label>
                <p className="text-sm text-gray-900 mt-1">
                  {device.groups?.name || 'No group assigned'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Created</label>
                <p className="text-sm text-gray-900 mt-1">
                  {new Date(device.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Status & Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Status & Activity
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Current Status</label>
                <div className="mt-1">
                  <span
                    className={`text-sm font-medium px-3 py-1 rounded-full border ${
                      statusConfig[device.status || 'offline'].color
                    }`}
                  >
                    {statusConfig[device.status || 'offline'].label}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Last Updated</label>
                <p className="text-sm text-gray-900 mt-1">
                  {new Date().toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Client ID</label>
                <p className="text-sm font-mono text-gray-900 mt-1">
                  {device.client_id || 'Not assigned'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Clips Section */}
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Film className="w-5 h-5 mr-2" />
                Downloaded Clips
              </h2>
              {device.serial && (
                <RequestClipDialog 
                  serial={device.serial} 
                  onClipRequested={() => {
                    console.log("DEBUG::DevicePage", "Clip requested, will rely on real-time updates for progress")
                    // Removed manual fetchClips call - real-time subscription will handle updates
                  }}
                />
              )}
            </div>
            
            {clipsLoading ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Loading clips...</p>
              </div>
            ) : clips.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Film className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No clips available for this device</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clips.map((clip) => (
                  <div 
                    key={clip.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {cameraNames[clip.camera as 0 | 1]} Camera
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-600">
                            {profileNames[clip.profile as 0 | 1]}
                          </span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border ml-2 ${
                              clipStatusConfig[clip.status as keyof typeof clipStatusConfig]?.color || 
                              'bg-gray-500/10 text-gray-500 border-gray-500/20'
                            }`}
                          >
                            {clipStatusConfig[clip.status as keyof typeof clipStatusConfig]?.label || clip.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-2">
                          <div>
                            <span className="font-medium">Start:</span> {formatUtcTimestamp(clip.start_utc)}
                          </div>
                          <div>
                            <span className="font-medium">End:</span> {formatUtcTimestamp(clip.end_utc)}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {formatDuration(clip.duration_seconds)}
                          </div>
                          <div>
                            <span className="font-medium">Size:</span> {formatFileSize(clip.file_size)}
                          </div>
                        </div>

                        {clip.status === 'receiving' && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                              <span>Progress: {clip.progress_percent}%</span>
                              <span>({formatFileSize(clip.bytes_received)} received)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-blue-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${clip.progress_percent}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {clip.error_message && (
                          <div className="mt-2 text-xs text-red-600">
                            Error: {clip.error_message}
                          </div>
                        )}

                        <div className="text-xs text-gray-500 mt-2">
                          Created: {formatDateTime(clip.created_at)}
                        </div>
                      </div>

                      <div className="ml-4 flex gap-2">
                        {(clip.status === 'ready' || clip.status === 'completed') && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setClipToPlay(clip)
                                setPlayerOpen(true)
                              }}
                              disabled={downloadingClipId === clip.id}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Play
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadClip(clip)}
                              disabled={downloadingClipId === clip.id}
                            >
                              {downloadingClipId === clip.id ? (
                                <>
                                  <div className="w-4 h-4 mr-1 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4 mr-1" />
                                  Download
                                </>
                              )}
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setClipToDelete(clip)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={downloadingClipId === clip.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Future sections for more data */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Location/Network Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Location & Network
            </h2>
            <div className="text-center py-8 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Location and network information coming soon</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Recent Activity
            </h2>
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Activity logs and history coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!clipToDelete} onOpenChange={(open) => !open && setClipToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clip?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this clip? This action cannot be undone and will permanently remove the clip from both the database and storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {clipToDelete && (
            <div className="mt-2 p-3 bg-gray-50 rounded border text-sm text-gray-900">
              <div><span className="font-medium">Camera:</span> {cameraNames[clipToDelete.camera as 0 | 1]}</div>
              <div><span className="font-medium">Profile:</span> {profileNames[clipToDelete.profile as 0 | 1]}</div>
              <div><span className="font-medium">Duration:</span> {formatDuration(clipToDelete.duration_seconds)}</div>
              <div><span className="font-medium">Size:</span> {formatFileSize(clipToDelete.file_size)}</div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                deleteClip()
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? 'Deleting...' : 'Delete Clip'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Video Player Dialog */}
      <VideoPlayerDialog
        clip={clipToPlay}
        open={playerOpen}
        onOpenChange={(open) => {
          setPlayerOpen(open)
          if (!open) {
            setClipToPlay(null)
          }
        }}
      />
    </div>
  )
}
