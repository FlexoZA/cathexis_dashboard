"use client"

import { useEffect, useRef, useState } from "react"
import { X, Loader2 } from "lucide-react"
import videojs from "video.js"
import type Player from "video.js/dist/types/player"
import "video.js/dist/video-js.css"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"

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
}

interface VideoPlayerDialogProps {
  clip: Clip | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const cameraNames = {
  0: 'Road',
  1: 'Cab'
}

const profileNames = {
  0: 'High Resolution',
  1: 'Low Resolution'
}

export function VideoPlayerDialog({ clip, open, onOpenChange }: VideoPlayerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<Player | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get or generate signed URL
  useEffect(() => {
    if (!open || !clip) {
      setVideoUrl(null)
      setError(null)
      return
    }

    async function getVideoUrl() {
      if (!clip) return
      
      try {
        setLoading(true)
        setError(null)
        console.log("DEBUG::VideoPlayerDialog", "Getting video URL for clip:", clip.id)

        // Check if we have a valid signed URL that hasn't expired
        if (clip.signed_url && clip.signed_url_expires_at) {
          const expiresAt = new Date(clip.signed_url_expires_at)
          const now = new Date()
          
          // Add 5 minute buffer before expiration
          if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
            console.log("DEBUG::VideoPlayerDialog", "Using existing signed URL")
            setVideoUrl(clip.signed_url)
            return
          }
        }

        // Generate new signed URL
        console.log("DEBUG::VideoPlayerDialog", "Generating new signed URL for:", clip.storage_path)
        const { data, error } = await supabase.storage
          .from('clips')
          .createSignedUrl(clip.storage_path, 3600) // 1 hour expiry

        if (error) {
          console.log("DEBUG::VideoPlayerDialog", "Error generating signed URL:", error)
          throw error
        }

        if (!data?.signedUrl) {
          throw new Error('Failed to generate signed URL')
        }

        console.log("DEBUG::VideoPlayerDialog", "Generated new signed URL")
        setVideoUrl(data.signedUrl)
      } catch (err: any) {
        console.log("DEBUG::VideoPlayerDialog", "Error getting video URL:", err)
        setError(err.message || 'Failed to load video')
      } finally {
        setLoading(false)
      }
    }

    getVideoUrl()
  }, [open, clip])

  // Cleanup player when dialog closes
  useEffect(() => {
    if (!open) {
      // Cleanup when closing
      if (playerRef.current) {
        console.log("DEBUG::VideoPlayerDialog", "Dialog closed, disposing player")
        try {
          playerRef.current.dispose()
        } catch (e) {
          console.error("DEBUG::VideoPlayerDialog", "Error disposing player:", e)
        }
        playerRef.current = null
      }

      // Also dispose any Video.js players that might be associated with this container
      try {
        const players = videojs.getPlayers()
        Object.keys(players).forEach(playerId => {
          const player = players[playerId]
          if (player && player.el() && containerRef.current && containerRef.current.contains(player.el())) {
            console.log("DEBUG::VideoPlayerDialog", "Disposing orphaned Video.js player on close:", playerId)
            player.dispose()
          }
        })
      } catch (e) {
        console.error("DEBUG::VideoPlayerDialog", "Error checking for orphaned players on close:", e)
      }

      // Reset state
      setVideoUrl(null)
      setError(null)
      setLoading(false)
    }
  }, [open])

  // Initialize Video.js player
  useEffect(() => {
    console.log("DEBUG::VideoPlayerDialog", "Player init effect triggered", {
      hasContainer: !!containerRef.current,
      hasVideoUrl: !!videoUrl,
      open,
      hasExistingPlayer: !!playerRef.current
    })

    if (!containerRef.current || !videoUrl || !open) {
      console.log("DEBUG::VideoPlayerDialog", "Skipping player init - conditions not met")
      return
    }

    // Always reinitialize when dialog opens with a video URL
    // We dispose the player on close, so no need to check for existing player

    const initializePlayer = () => {
      if (!containerRef.current) {
        console.log("DEBUG::VideoPlayerDialog", "Container not ready in initialize function")
        return
      }

      // Dispose any existing player to prevent memory leaks
      if (playerRef.current) {
        try {
          console.log("DEBUG::VideoPlayerDialog", "Disposing existing player before reinitialization")
          playerRef.current.dispose()
        } catch (e) {
          console.error("DEBUG::VideoPlayerDialog", "Error disposing existing player:", e)
        }
        playerRef.current = null
      }

      // Also dispose any Video.js players that might be associated with this container
      try {
        const players = videojs.getPlayers()
        Object.keys(players).forEach(playerId => {
          const player = players[playerId]
          if (player && player.el() && containerRef.current && containerRef.current.contains(player.el())) {
            console.log("DEBUG::VideoPlayerDialog", "Disposing orphaned Video.js player:", playerId)
            player.dispose()
          }
        })
      } catch (e) {
        console.error("DEBUG::VideoPlayerDialog", "Error checking for orphaned players:", e)
      }

      // Clear container completely
      console.log("DEBUG::VideoPlayerDialog", "Clearing container and creating new video element")
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild)
      }

      // Create video element with unique ID to prevent Video.js conflicts
      const uniqueId = `video-player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const videoElement = document.createElement('video')
      videoElement.id = uniqueId
      videoElement.className = 'video-js vjs-big-play-centered vjs-16-9'
      videoElement.setAttribute('playsinline', '')
      
      // Create source element
      const sourceElement = document.createElement('source')
      sourceElement.src = videoUrl
      sourceElement.type = 'video/mp4'
      
      videoElement.appendChild(sourceElement)
      containerRef.current.appendChild(videoElement)

      console.log("DEBUG::VideoPlayerDialog", "Initializing Video.js player")

      try {
        // Initialize Video.js
        const player = videojs(videoElement, {
          controls: true,
          fluid: true,
          responsive: true,
          playbackRates: [0.5, 1, 1.5, 2],
          controlBar: {
            pictureInPictureToggle: true,
            fullscreenToggle: true,
          },
          html5: {
            vhs: {
              withCredentials: false,
            },
          },
        })

        playerRef.current = player

        console.log("DEBUG::VideoPlayerDialog", "Video.js player initialized successfully")
      } catch (error) {
        console.error("DEBUG::VideoPlayerDialog", "Error initializing player:", error)
      }
    }

    // Initialize immediately - DOM should be ready since we're in a useEffect
    initializePlayer()
  }, [videoUrl, open])

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function formatDateTime(utc: number): string {
    return new Date(utc * 1000).toLocaleString()
  }

  if (!clip) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">
                {cameraNames[clip.camera as 0 | 1]} Camera - {profileNames[clip.profile as 0 | 1]}
              </div>
              <div className="text-sm font-normal text-gray-600 mt-1">
                {formatDateTime(clip.start_utc)} • Duration: {formatDuration(clip.duration_seconds)}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="w-full">
          {loading && (
            <div className="flex items-center justify-center bg-black rounded aspect-video">
              <div className="text-center text-white">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
                <p>Loading video...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center bg-black rounded aspect-video">
              <div className="text-center text-red-400">
                <X className="w-12 h-12 mx-auto mb-4" />
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Container is always mounted to keep ref stable */}
          <div 
            ref={containerRef} 
            data-vjs-player 
            className={!loading && !error && videoUrl ? '' : 'hidden'}
          />
        </div>

        <div className="text-xs text-gray-500 mt-2">
          Clip ID: {clip.id} • Storage: {clip.storage_path}
        </div>
      </DialogContent>
    </Dialog>
  )
}

