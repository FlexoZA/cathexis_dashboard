"use client"

import { useState, useEffect, useRef } from "react"
import { Play, StopCircle, Loader2 } from "lucide-react"
import videojs from "video.js"
import type Player from "video.js/dist/types/player"
import "video.js/dist/video-js.css"
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

interface LiveStreamDialogProps {
  serial: string
  deviceName: string
  disabled?: boolean
}

type StreamStatus = 'stopped' | 'starting' | 'active' | 'error'

const cameraOptions = [
  { value: 0, label: 'Road Camera' },
  { value: 1, label: 'Driver Camera' }
]

const profileOptions = [
  { value: 0, label: 'High Resolution (1080p/720p)' },
  { value: 1, label: 'Low Resolution (360p)' }
]

const STREAMING_SERVER_URL =
  (process.env.NEXT_PUBLIC_CWE_MVR_API_URL?.replace(/\/$/, '') ||
    'http://109.199.118.33:9000')

export function LiveStreamDialog({ serial, deviceName, disabled = false }: LiveStreamDialogProps) {
  const [open, setOpen] = useState(false)
  const [camera, setCamera] = useState<number>(1)
  const [profile, setProfile] = useState<number>(1)
  const [status, setStatus] = useState<StreamStatus>('stopped')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [dialogKey, setDialogKey] = useState(0) // Force remount on stop
  
  const playerRef = useRef<Player | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const statusRef = useRef<StreamStatus>('stopped')
  const serialRef = useRef(serial)
  const cameraRef = useRef(camera)
  const profileRef = useRef(profile)

  // Keep refs in sync
  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    serialRef.current = serial
    cameraRef.current = camera
    profileRef.current = profile
  }, [serial, camera, profile])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      if (playerRef.current) {
        try {
          playerRef.current.dispose()
        } catch (e) {
          console.error("DEBUG::LiveStreamDialog", "Error disposing player:", e)
        }
      }
      if (statusRef.current === 'active' || statusRef.current === 'starting') {
        fetch('/api/stream/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serial: serialRef.current,
            camera: cameraRef.current,
            profile: profileRef.current
          }),
          keepalive: true
        }).catch(console.error)
      }
    }
  }, [])

  // Initialize player when stream is active
  useEffect(() => {
    if (!containerRef.current || !streamUrl || status !== 'active') {
      return
    }

    // Dispose existing player
    if (playerRef.current) {
      try {
        playerRef.current.dispose()
      } catch (e) {
        console.error("DEBUG::LiveStreamDialog", "Error disposing existing player:", e)
      }
      playerRef.current = null
    }

    // Clear container
    containerRef.current.innerHTML = ''

    // Create video element
    const videoElement = document.createElement('video')
    videoElement.id = `live-stream-${Date.now()}`
    videoElement.className = 'video-js vjs-big-play-centered vjs-16-9'
    videoElement.setAttribute('playsinline', '')
    containerRef.current.appendChild(videoElement)

    console.log("DEBUG::LiveStreamDialog", "Initializing player:", streamUrl)

    try {
      const player = videojs(videoElement, {
        controls: true,
        autoplay: true,
        preload: 'auto',
        liveui: true,
        fluid: true,
        responsive: true,
        sources: [{
          src: streamUrl,
          type: 'application/x-mpegURL'
        }]
      })

      player.on('error', () => {
        const err = player.error()
        console.error('DEBUG::LiveStreamDialog', 'Player error:', err)
        setError(`Player error: ${err?.message || 'Unknown'}`)
      })

      playerRef.current = player
    } catch (err) {
      console.error("DEBUG::LiveStreamDialog", "Error initializing player:", err)
      setError('Failed to initialize video player')
    }
  }, [streamUrl, status])

  async function startStream() {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial, camera, profile, period: 0 })
      })
      
      const data = await response.json()
      console.log("DEBUG::LiveStreamDialog", "Start response:", data)
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to start stream')
      }
      
      setStatus('starting')
      const hlsUrl = `${STREAMING_SERVER_URL}${data.stream_url || `/hls/${serial}/${camera}/${profile}/stream.m3u8`}`
      setStreamUrl(hlsUrl)
      pollStreamStatus()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  function stopStream() {
    console.log("DEBUG::LiveStreamDialog", "Stopping stream and closing dialog")
    
    // Clear polling first
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    // Dispose player BEFORE closing dialog to avoid React DOM conflicts
    if (playerRef.current) {
      try {
        playerRef.current.dispose()
      } catch (e) {
        console.error("DEBUG::LiveStreamDialog", "Error disposing player:", e)
      }
      playerRef.current = null
    }

    // Clear container manually to be safe
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }

    // Reset state and close
    setStreamUrl(null)
    setStatus('stopped')
    setError(null)
    setDialogKey(k => k + 1) // Force remount on next open
    setOpen(false)
    
    // Stop stream in background
    fetch('/api/stream/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial, camera, profile })
    })
      .then(res => res.json())
      .then(data => console.log("DEBUG::LiveStreamDialog", "Stop response:", data))
      .catch(err => console.error("DEBUG::LiveStreamDialog", "Error stopping stream:", err))
  }

  function pollStreamStatus() {
    let attempts = 0
    const maxAttempts = 10
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
    
    pollingIntervalRef.current = setInterval(async () => {
      attempts++
      
      try {
        const response = await fetch('/api/stream/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serial, camera, profile })
        })
        const data = await response.json()
        
        if (data.status === 'active') {
          setStatus('active')
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        } else if (data.status === 'stopped' || attempts >= maxAttempts) {
          if (attempts >= maxAttempts) {
            setError('Stream failed to start')
          }
          setStatus('error')
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          setError('Failed to check stream status')
          setStatus('error')
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        }
      }
    }, 2000)
  }

  const isStreaming = status === 'starting' || status === 'active'

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (disabled && newOpen) return
      // Only allow closing when not streaming
      if (!newOpen && isStreaming) {
        return
      }
      setOpen(newOpen)
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1" disabled={disabled}>
          <Play className="w-4 h-4" />
          Stream
        </Button>
      </DialogTrigger>
      <DialogContent 
        key={dialogKey}
        className="sm:max-w-4xl"
        onInteractOutside={(e) => {
          if (isStreaming) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isStreaming) e.preventDefault()
        }}
        hideCloseButton={isStreaming}
      >
        <DialogHeader>
          <DialogTitle>Live Stream - {deviceName}</DialogTitle>
          <DialogDescription>
            Stream live video from the device camera
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === 'stopped' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="camera">Camera</Label>
                  <Select 
                    value={camera.toString()} 
                    onValueChange={(v) => setCamera(parseInt(v))}
                    disabled={isLoading}
                  >
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
                  <Select 
                    value={profile.toString()} 
                    onValueChange={(v) => setProfile(parseInt(v))}
                    disabled={isLoading}
                  >
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
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                <div className="font-medium mb-1">Note:</div>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Low resolution recommended for live streaming</li>
                  <li>Stream will take 5-10 seconds to start</li>
                  <li>Expected latency: 6-12 seconds</li>
                </ul>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                  {error}
                </div>
              )}

              <Button onClick={startStream} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting Stream...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Live Stream
                  </>
                )}
              </Button>
            </>
          )}

          {status !== 'stopped' && (
            <>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    status === 'active' ? 'bg-green-500 animate-pulse' :
                    status === 'starting' ? 'bg-yellow-500 animate-pulse' :
                    'bg-red-500'
                  }`} />
                  <div>
                    <div className="text-sm font-medium">
                      Status: {status === 'active' ? 'Live' : status === 'starting' ? 'Starting...' : 'Error'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {cameraOptions.find(c => c.value === camera)?.label} • {profileOptions.find(p => p.value === profile)?.label}
                    </div>
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={stopStream} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <StopCircle className="w-4 h-4 mr-2" />
                      Stop Stream
                    </>
                  )}
                </Button>
              </div>

              {status === 'starting' && (
                <div className="flex items-center justify-center bg-black rounded aspect-video">
                  <div className="text-center text-white">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
                    <p>Connecting to device...</p>
                    <p className="text-sm text-gray-400 mt-2">This may take 5-10 seconds</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                  {error}
                </div>
              )}
            </>
          )}

          {/* Video container - always rendered to prevent React DOM conflicts */}
          <div 
            ref={containerRef} 
            data-vjs-player 
            className={`w-full ${status !== 'active' ? 'hidden' : ''}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
