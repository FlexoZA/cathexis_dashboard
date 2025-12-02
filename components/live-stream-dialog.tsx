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

const STREAMING_SERVER_URL = 'https://labsdb.cwe.cloud:9000'

export function LiveStreamDialog({ serial, deviceName }: LiveStreamDialogProps) {
  const [open, setOpen] = useState(false)
  const [camera, setCamera] = useState<number>(1) // Default to cab camera (1) as user is testing with this
  const [profile, setProfile] = useState<number>(1) // Default to low res for live streaming
  const [status, setStatus] = useState<StreamStatus>('stopped')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<Player | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on dialog close
  useEffect(() => {
    if (!open) {
      // Clean up player
      if (playerRef.current) {
        console.log("DEBUG::LiveStreamDialog", "Disposing player on dialog close")
        try {
          playerRef.current.dispose()
        } catch (e) {
          console.error("DEBUG::LiveStreamDialog", "Error disposing player:", e)
        }
        playerRef.current = null
      }

      // Clear polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }

      // Reset state
      setStreamUrl(null)
      setError(null)
      setStatus('stopped')
    }
  }, [open])

  // Auto-stop stream when dialog closes (cleanup)
  useEffect(() => {
    return () => {
      if (status === 'active' || status === 'starting') {
        console.log("DEBUG::LiveStreamDialog", "Component unmounting, stopping stream")
        // Best effort stream stop via API route
        fetch('/api/stream/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serial,
            camera,
            profile
          }),
          keepalive: true
        }).catch(console.error)
      }
    }
  }, [status, serial, camera, profile])

  // Initialize Video.js player when stream URL is available
  useEffect(() => {
    if (!containerRef.current || !streamUrl || status !== 'active') {
      return
    }

    const initializePlayer = () => {
      if (!containerRef.current) return

      // Dispose existing player
      if (playerRef.current) {
        try {
          console.log("DEBUG::LiveStreamDialog", "Disposing existing player")
          playerRef.current.dispose()
        } catch (e) {
          console.error("DEBUG::LiveStreamDialog", "Error disposing player:", e)
        }
        playerRef.current = null
      }

      // Clear container
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild)
      }

      // Create video element
      const uniqueId = `live-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const videoElement = document.createElement('video')
      videoElement.id = uniqueId
      videoElement.className = 'video-js vjs-big-play-centered vjs-16-9'
      videoElement.setAttribute('playsinline', '')
      
      containerRef.current.appendChild(videoElement)

      console.log("DEBUG::LiveStreamDialog", "Initializing Video.js player for HLS stream:", streamUrl)

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
          const playerError = player.error()
          console.error('DEBUG::LiveStreamDialog', 'Video.js error:', playerError)
          setError(`Player error: ${playerError?.message || 'Unknown error'}`)
        })

        playerRef.current = player
        console.log("DEBUG::LiveStreamDialog", "Video.js player initialized successfully")
      } catch (error) {
        console.error("DEBUG::LiveStreamDialog", "Error initializing player:", error)
        setError('Failed to initialize video player')
      }
    }

    initializePlayer()
  }, [streamUrl, status])

  async function startStream() {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log("DEBUG::LiveStreamDialog", "Starting stream:", { serial, camera, profile })
      
      const response = await fetch('/api/stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial,
          camera,
          profile,
          period: 0 // Indefinite
        })
      })
      
      const data = await response.json()
      console.log("DEBUG::LiveStreamDialog", "Stream start response:", data)
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to start stream')
      }
      
      setStatus('starting')
      
      // Construct HLS URL directly to streaming server
      // HLS must be loaded directly from the streaming server, not through API proxy
      const hlsUrl = `${STREAMING_SERVER_URL}/cathexis.cwe.cloud/hls/${serial}/${camera}/${profile}/stream.m3u8`
      console.log("DEBUG::LiveStreamDialog", "HLS URL:", hlsUrl)
      setStreamUrl(hlsUrl)
      
      // Start polling for stream readiness
      pollStreamStatus()
      
    } catch (err) {
      console.log("DEBUG::LiveStreamDialog", "Error starting stream:", err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  async function stopStream() {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log("DEBUG::LiveStreamDialog", "Stopping stream:", { serial, camera, profile })
      
      const response = await fetch('/api/stream/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial,
          camera,
          profile
        })
      })
      
      const data = await response.json()
      console.log("DEBUG::LiveStreamDialog", "Stream stop response:", data)
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to stop stream')
      }
      
      // Clear polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }

      // Dispose player
      if (playerRef.current) {
        playerRef.current.dispose()
        playerRef.current = null
      }

      setStatus('stopped')
      setStreamUrl(null)
      
    } catch (err) {
      console.log("DEBUG::LiveStreamDialog", "Error stopping stream:", err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  function pollStreamStatus() {
    let attempts = 0
    const maxAttempts = 10 // 20 seconds max
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
    
    pollingIntervalRef.current = setInterval(async () => {
      attempts++
      console.log("DEBUG::LiveStreamDialog", `Polling stream status (attempt ${attempts}/${maxAttempts})`)
      
      try {
        const response = await fetch('/api/stream/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serial,
            camera,
            profile
          })
        })
        const data = await response.json()
        
        console.log("DEBUG::LiveStreamDialog", "Stream status response:", data)
        
        if (data.status === 'active') {
          setStatus('active')
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        } else if (data.status === 'stopped') {
          setStatus('stopped')
          setError('Stream was stopped')
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        } else if (attempts >= maxAttempts) {
          setError('Stream failed to start within 20 seconds')
          setStatus('error')
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        }
        
      } catch (err) {
        console.error('DEBUG::LiveStreamDialog', 'Status poll error:', err)
        if (attempts >= maxAttempts) {
          setError('Failed to check stream status')
          setStatus('error')
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        }
      }
    }, 2000) // Poll every 2 seconds
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1">
          <Play className="w-4 h-4" />
          Stream
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Live Stream - {deviceName}</DialogTitle>
          <DialogDescription>
            Stream live video from the device camera
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Camera and Profile Selection */}
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
                  <li>Low resolution recommended for live streaming (less bandwidth)</li>
                  <li>Stream will take 5-10 seconds to start</li>
                  <li>Expected latency: 6-12 seconds (HLS standard)</li>
                </ul>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                  {error}
                </div>
              )}

              <Button 
                onClick={startStream}
                disabled={isLoading}
                className="w-full"
              >
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

          {/* Stream Status and Video Player */}
          {status !== 'stopped' && (
            <>
              {/* Status Indicator */}
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
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={stopStream}
                  disabled={isLoading}
                >
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

              {/* Video Player */}
              {status === 'starting' && (
                <div className="flex items-center justify-center bg-black rounded aspect-video">
                  <div className="text-center text-white">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
                    <p>Connecting to device...</p>
                    <p className="text-sm text-gray-400 mt-2">This may take 5-10 seconds</p>
                  </div>
                </div>
              )}

              {status === 'active' && (
                <div 
                  ref={containerRef} 
                  data-vjs-player 
                  className="w-full"
                />
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

