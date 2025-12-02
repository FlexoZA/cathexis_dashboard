# Frontend Live Streaming Integration Guide

This guide shows how to integrate live streaming from MVR5 devices into your Next.js frontend using video.js.

## Installation

Install video.js in your Next.js project:

```bash
npm install video.js
```

## Basic Video.js Player Component

Create a reusable React component for live streaming:

```tsx
'use client';
import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';

interface LiveStreamProps {
  serial: string;
  camera?: number;  // 0=Road, 1=Cab
  profile?: number; // 0=High res, 1=Low res
  backendUrl?: string;
}

export default function LiveStream({ 
  serial, 
  camera = 0, 
  profile = 1,
  backendUrl = 'http://localhost:9000'
}: LiveStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Player | null>(null);
  
  useEffect(() => {
    // Initialize video.js player
    if (!playerRef.current && videoRef.current) {
      const player = videojs(videoRef.current, {
        controls: true,
        autoplay: true,
        preload: 'auto',
        liveui: true,
        fluid: true,
        responsive: true,
        sources: [{
          src: `${backendUrl}/hls/${serial}/${camera}/${profile}/stream.m3u8`,
          type: 'application/x-mpegURL'
        }]
      });
      
      // Error handling
      player.on('error', () => {
        const error = player.error();
        console.error('Video.js error:', error);
      });
      
      playerRef.current = player;
    }
    
    // Cleanup on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [serial, camera, profile, backendUrl]);
  
  return (
    <div data-vjs-player className="w-full">
      <video 
        ref={videoRef} 
        className="video-js vjs-big-play-centered vjs-16-9"
      />
    </div>
  );
}
```

## Complete Stream Management Component

For production use, create a component that manages the full streaming lifecycle:

```tsx
'use client';
import { useState, useEffect } from 'react';
import LiveStream from './LiveStream';

interface StreamManagerProps {
  serial: string;
  camera?: number;
  profile?: number;
  backendUrl?: string;
}

type StreamStatus = 'stopped' | 'starting' | 'active' | 'error';

export default function StreamManager({ 
  serial, 
  camera = 0, 
  profile = 1,
  backendUrl = 'http://localhost:9000'
}: StreamManagerProps) {
  const [status, setStatus] = useState<StreamStatus>('stopped');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Start stream
  const startStream = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${backendUrl}/api/units/${serial}/stream/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera, profile, period: 0 })
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to start stream');
      }
      
      setStatus('starting');
      
      // Poll for stream readiness
      pollStreamStatus();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Stop stream
  const stopStream = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${backendUrl}/api/units/${serial}/stream/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera, profile })
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to stop stream');
      }
      
      setStatus('stopped');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Poll stream status
  const pollStreamStatus = () => {
    let attempts = 0;
    const maxAttempts = 10; // 20 seconds max
    
    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await fetch(
          `${backendUrl}/api/units/${serial}/stream/status?camera=${camera}&profile=${profile}`
        );
        const data = await response.json();
        
        if (data.status === 'active') {
          setStatus('active');
          clearInterval(interval);
        } else if (data.status === 'stopped') {
          setStatus('stopped');
          clearInterval(interval);
        } else if (attempts >= maxAttempts) {
          setError('Stream failed to start within 20 seconds');
          setStatus('error');
          clearInterval(interval);
        }
        
      } catch (err) {
        console.error('Status poll error:', err);
        if (attempts >= maxAttempts) {
          setError('Failed to check stream status');
          setStatus('error');
          clearInterval(interval);
        }
      }
    }, 2000); // Poll every 2 seconds
  };

  // Check initial status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(
          `${backendUrl}/api/units/${serial}/stream/status?camera=${camera}&profile=${profile}`
        );
        const data = await response.json();
        
        if (data.status === 'active' || data.status === 'starting') {
          setStatus(data.status);
        }
      } catch (err) {
        console.error('Initial status check failed:', err);
      }
    };
    
    checkStatus();
  }, [serial, camera, profile, backendUrl]);

  // Auto-stop on unmount
  useEffect(() => {
    return () => {
      if (status === 'active' || status === 'starting') {
        fetch(`${backendUrl}/api/units/${serial}/stream/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ camera, profile }),
          keepalive: true // Ensure request completes even if page is closing
        }).catch(console.error);
      }
    };
  }, [status, serial, camera, profile, backendUrl]);

  return (
    <div className="space-y-4">
      {/* Control buttons */}
      <div className="flex gap-2">
        <button
          onClick={startStream}
          disabled={isLoading || status === 'active' || status === 'starting'}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {status === 'starting' ? 'Starting...' : 'Start Stream'}
        </button>
        
        <button
          onClick={stopStream}
          disabled={isLoading || status === 'stopped'}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
        >
          Stop Stream
        </button>
      </div>

      {/* Status indicator */}
      <div className="text-sm">
        Status: <span className={`font-semibold ${
          status === 'active' ? 'text-green-600' :
          status === 'starting' ? 'text-yellow-600' :
          status === 'error' ? 'text-red-600' :
          'text-gray-600'
        }`}>
          {status.toUpperCase()}
        </span>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {/* Video player */}
      {(status === 'active' || status === 'starting') && (
        <div className="bg-black rounded-lg overflow-hidden">
          <LiveStream 
            serial={serial}
            camera={camera}
            profile={profile}
            backendUrl={backendUrl}
          />
        </div>
      )}
    </div>
  );
}
```

## Usage Example

In your Next.js page or component:

```tsx
import StreamManager from '@/components/StreamManager';

export default function VehiclePage({ params }: { params: { serial: string } }) {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Vehicle {params.serial} - Live View
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Road camera - Low res */}
        <div>
          <h2 className="text-xl mb-2">Road Camera</h2>
          <StreamManager 
            serial={params.serial}
            camera={0}
            profile={1}
          />
        </div>
        
        {/* Cab camera - Low res */}
        <div>
          <h2 className="text-xl mb-2">Cab Camera</h2>
          <StreamManager 
            serial={params.serial}
            camera={1}
            profile={1}
          />
        </div>
      </div>
    </div>
  );
}
```

## API Reference

### Start Stream

**Endpoint:** `POST /api/units/:serial/stream/start`

**Request body:**
```json
{
  "camera": 0,      // 0=Road, 1=Cab
  "profile": 1,     // 0=High res, 1=Low res
  "period": 300     // Duration in seconds (0=indefinite)
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Stream start command sent. Stream will be ready in 5-10 seconds.",
  "serial": "MVR5452 6111434",
  "camera": 0,
  "profile": 1,
  "stream_url": "/hls/MVR5452-6111434/0/1/stream.m3u8",
  "check_status_url": "/api/units/MVR5452-6111434/stream/status?camera=0&profile=1"
}
```

### Stop Stream

**Endpoint:** `POST /api/units/:serial/stream/stop`

**Request body:**
```json
{
  "camera": 0,
  "profile": 1
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Stream stop command sent",
  "serial": "MVR5452 6111434",
  "camera": 0,
  "profile": 1
}
```

### Check Stream Status

**Endpoint:** `GET /api/units/:serial/stream/status?camera=0&profile=1`

**Response (active):**
```json
{
  "ok": true,
  "status": "active",
  "serial": "MVR5452 6111434",
  "camera": 0,
  "profile": 1,
  "stream_url": "/hls/MVR5452-6111434/0/1/stream.m3u8",
  "start_time": "2025-12-02T10:30:00.000Z",
  "uptime_ms": 45000,
  "last_activity": "2025-12-02T10:30:45.000Z"
}
```

**Response (stopped):**
```json
{
  "ok": true,
  "status": "stopped",
  "message": "Stream not active",
  "serial": "MVR5452 6111434",
  "camera": 0,
  "profile": 1
}
```

### List All Active Streams

**Endpoint:** `GET /api/streams`

**Response:**
```json
{
  "ok": true,
  "streams": [
    {
      "streamKey": "MVR5452-6111434:0:1",
      "serial": "MVR5452-6111434",
      "camera": 0,
      "profile": 1,
      "hlsPath": "/path/to/hls/MVR5452-6111434/0/1",
      "startTime": "2025-12-02T10:30:00.000Z",
      "lastActivity": "2025-12-02T10:30:45.000Z",
      "uptime": 45000,
      "isActive": true
    }
  ],
  "count": 1
}
```

## Troubleshooting

### Stream Not Starting

1. **Check device connection:**
   ```bash
   curl http://localhost:9000/api/units
   ```
   Ensure the device serial appears in the list.

2. **Check stream status:**
   ```bash
   curl "http://localhost:9000/api/units/YOUR_SERIAL/stream/status?camera=0&profile=1"
   ```

3. **Check server logs:**
   Look for `DEBUG::tcp/videoServer` entries showing connection and frame data.

### Video Player Not Loading

1. **Verify HLS files exist:**
   Check `hls/YOUR_SERIAL/0/1/stream.m3u8` exists and is being updated.

2. **Check CORS:**
   If frontend and backend are on different domains, ensure CORS is enabled.

3. **Browser compatibility:**
   HLS playback requires:
   - Chrome/Edge: Native support
   - Firefox: Native support
   - Safari: Native support
   - Older browsers: May need additional polyfills

### High Latency

HLS has inherent latency of 6-12 seconds due to segment buffering. This is normal and acceptable for most fleet management use cases.

## Performance Tips

1. **Use low profile (1) for live streaming:** High resolution (0) uses more bandwidth
2. **Limit concurrent streams:** Each stream consumes ~400Kbps (low) or ~2Mbps (high)
3. **Set appropriate stream timeout:** Streams auto-cleanup after 5 minutes of inactivity
4. **Always stop streams when done:** Call stop API or rely on auto-cleanup

## Notes

- Streams use port 32326 (separate from clip download on 32325)
- FFmpeg runs on the backend server (no client-side processing)
- Audio is not yet supported (video only)
- Single viewer per stream (no CDN/multi-viewer optimization)
- No authentication required (as per current requirements)

