# Live Streaming Testing Guide

This guide will help you test the live streaming implementation with your MVR5 device.

## Prerequisites

1. **Backend is running:**
   ```bash
   npm start
   ```
   
2. **FFmpeg is installed:**
   ```bash
   ffmpeg -version
   ```
   If not installed:
   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install ffmpeg
   
   # macOS
   brew install ffmpeg
   ```

3. **MVR5 device is configured:**
   - Control port: 32324 (existing)
   - Clip port: 32325 (existing)
   - Stream port: 32326 (NEW - will be used automatically)

## Test Plan

### Step 1: Verify Backend is Running

Check that all servers are listening:

```bash
# Check if all ports are listening
netstat -tuln | grep -E '32324|32325|32326|9000'
```

Expected output should show:
- Port 32324 (control) - LISTENING
- Port 32325 (clip receiver) - LISTENING  
- Port 32326 (stream server) - LISTENING
- Port 9000 (HTTP API) - LISTENING

### Step 2: Verify Device Connection

Check that your MVR5 device is connected:

```bash
curl http://localhost:9000/api/units
```

Expected output:
```json
{
  "units": ["MVR5452-6111434"],
  "count": 1
}
```

If device is not listed, check:
- Device network connectivity
- Device commissioning settings (control port should be 32324)
- Backend logs for connection attempts

### Step 3: Start Live Stream (API Test)

Start a live stream using the API:

```bash
curl -X POST http://localhost:9000/api/units/YOUR_SERIAL/stream/start \
  -H "Content-Type: application/json" \
  -d '{"camera": 0, "profile": 1, "period": 0}'
```

Expected response:
```json
{
  "ok": true,
  "message": "Stream start command sent. Stream will be ready in 5-10 seconds.",
  "serial": "YOUR_SERIAL",
  "camera": 0,
  "profile": 1,
  "stream_url": "/hls/YOUR_SERIAL/0/1/stream.m3u8",
  "check_status_url": "/api/units/YOUR_SERIAL/stream/status?camera=0&profile=1"
}
```

### Step 4: Monitor Backend Logs

Watch the backend logs for streaming activity:

```bash
# Look for these log patterns:
# 1. Device connects to stream port
DEBUG::tcp/videoServer { event: 'connection', ... }

# 2. Welcome message received
DEBUG::tcp/videoServer { event: 'welcome', serial: '...' }

# 3. FFmpeg spawned
DEBUG::ffmpegManager { event: 'spawning_ffmpeg', ... }

# 4. Stream registered
DEBUG::hlsCatalog { event: 'stream_registered', ... }

# 5. Video frames being received
DEBUG::tcp/videoServer { event: 'video_frame', frameType: 'I', ... }
```

### Step 5: Check Stream Status

Poll the stream status:

```bash
curl "http://localhost:9000/api/units/YOUR_SERIAL/stream/status?camera=0&profile=1"
```

**Initially (starting):**
```json
{
  "ok": true,
  "status": "starting",
  "message": "Stream is starting, playlist not ready yet",
  "note": "Retry in a few seconds"
}
```

**After 5-10 seconds (active):**
```json
{
  "ok": true,
  "status": "active",
  "stream_url": "/hls/YOUR_SERIAL/0/1/stream.m3u8",
  "start_time": "2025-12-02T10:30:00.000Z",
  "uptime_ms": 8500
}
```

### Step 6: Verify HLS Files Created

Check that HLS files are being created:

```bash
# List HLS directory
ls -lah hls/YOUR_SERIAL/0/1/

# Should see:
# - stream.m3u8 (playlist)
# - segment_000.ts, segment_001.ts, etc. (video segments)

# Watch playlist being updated
watch -n 1 "ls -lah hls/YOUR_SERIAL/0/1/ && echo && cat hls/YOUR_SERIAL/0/1/stream.m3u8"
```

Expected playlist content:
```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:5
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:4.000000,
segment_000.ts
#EXTINF:4.000000,
segment_001.ts
#EXTINF:4.000000,
segment_002.ts
```

### Step 7: Test Stream Playback in Browser

1. **Open browser to:**
   ```
   http://localhost:9000/hls/YOUR_SERIAL/0/1/stream.m3u8
   ```
   
   The browser should download the playlist file.

2. **Test with video.js player:**
   Create a simple HTML test file (`test.html`):
   
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <link href="https://vjs.zencdn.net/8.6.1/video-js.css" rel="stylesheet" />
     <script src="https://vjs.zencdn.net/8.6.1/video.min.js"></script>
   </head>
   <body>
     <video id="my-video" class="video-js" controls preload="auto" width="640" height="360">
       <source src="http://localhost:9000/hls/YOUR_SERIAL/0/1/stream.m3u8" type="application/x-mpegURL">
     </video>
     
     <script>
       var player = videojs('my-video');
       player.on('error', function() {
         console.error('Player error:', player.error());
       });
     </script>
   </body>
   </html>
   ```
   
   Open this file in Chrome/Firefox/Safari and verify video plays.

### Step 8: Test Multiple Cameras

Test both road and cab cameras simultaneously:

```bash
# Start road camera (camera 0)
curl -X POST http://localhost:9000/api/units/YOUR_SERIAL/stream/start \
  -H "Content-Type: application/json" \
  -d '{"camera": 0, "profile": 1}'

# Start cab camera (camera 1)
curl -X POST http://localhost:9000/api/units/YOUR_SERIAL/stream/start \
  -H "Content-Type: application/json" \
  -d '{"camera": 1, "profile": 1}'

# List all active streams
curl http://localhost:9000/api/streams
```

### Step 9: Test Stream Stop

Stop a stream:

```bash
curl -X POST http://localhost:9000/api/units/YOUR_SERIAL/stream/stop \
  -H "Content-Type: application/json" \
  -d '{"camera": 0, "profile": 1}'
```

Verify:
- FFmpeg process is killed (check logs)
- HLS files are deleted
- Stream status shows "stopped"

### Step 10: Test Auto-Cleanup

1. Start a stream
2. Wait 5+ minutes without any activity
3. Check logs for cleanup message:
   ```
   DEBUG::hlsCatalog { event: 'removing_inactive_stream', inactiveSeconds: 300 }
   ```

### Step 11: Verify Clip Download Still Works

**CRITICAL TEST** - Ensure we didn't break existing functionality:

```bash
# Test clip request (should use port 32325, not 32326)
curl -X POST http://localhost:9000/api/units/YOUR_SERIAL/clips/request \
  -H "Content-Type: application/json" \
  -d '{
    "camera": 0,
    "profile": 1,
    "start_utc": 1733140000,
    "end_utc": 1733140060
  }'

# Check status
curl "http://localhost:9000/api/units/YOUR_SERIAL/clips/status?camera=0&start_utc=1733140000&end_utc=1733140060"
```

Clip download should work exactly as before (no changes to port 32325).

## Troubleshooting

### Issue: Device not connecting to stream port

**Check:**
1. Device received stream command:
   ```bash
   # Look for control channel log
   DEBUG::tcp/control { json_type: 'stream', ... }
   ```

2. Firewall allows port 32326:
   ```bash
   sudo ufw status | grep 32326
   # Or
   sudo iptables -L -n | grep 32326
   ```

3. Device can reach server:
   - Ping server IP from device network
   - Check device commissioning settings

### Issue: FFmpeg not starting

**Check:**
1. FFmpeg is installed:
   ```bash
   which ffmpeg
   ffmpeg -version
   ```

2. HLS directory is writable:
   ```bash
   ls -la hls/
   # Should be owned by user running Node.js
   ```

3. Check FFmpeg logs in backend output:
   ```
   DEBUG::ffmpegManager { ffmpeg_stderr: ... }
   ```

### Issue: HLS files not created

**Check:**
1. FFmpeg process is running:
   ```bash
   ps aux | grep ffmpeg
   ```

2. FFmpeg has write permissions:
   ```bash
   ls -la hls/YOUR_SERIAL/0/1/
   ```

3. Video frames are being received:
   ```bash
   # Should see video_frame logs
   DEBUG::tcp/videoServer { event: 'video_frame', ... }
   ```

### Issue: Video won't play in browser

**Check:**
1. Playlist exists and is valid:
   ```bash
   cat hls/YOUR_SERIAL/0/1/stream.m3u8
   ```

2. Segments exist:
   ```bash
   ls -la hls/YOUR_SERIAL/0/1/*.ts
   ```

3. Browser console for errors (F12 → Console)

4. MIME types are correct (should be automatic with express.static)

### Issue: High latency (>15 seconds)

**Normal behavior:**
- HLS has 6-12 second latency by design
- This is due to segment buffering

**To reduce (if needed):**
- Decrease `hlsSegmentDuration` in config (currently 4s)
- Decrease `hlsPlaylistSize` (currently 10 segments)
- Note: Smaller values = more CPU usage and less reliable playback

## Expected Performance

- **Latency:** 6-12 seconds (HLS standard)
- **Bandwidth per stream:**
  - Low res (profile 1): ~400 Kbps
  - High res (profile 0): ~2 Mbps
- **CPU usage:** ~5-10% per active stream (FFmpeg overhead)
- **Max concurrent streams:** 50 (configurable)

## Success Criteria

✅ Device connects to port 32326  
✅ FFmpeg spawns and runs  
✅ HLS files are created and updated  
✅ Video plays in browser with acceptable latency  
✅ Stream can be stopped cleanly  
✅ Inactive streams auto-cleanup after 5 minutes  
✅ **Clip download still works on port 32325**  
✅ Multiple streams can run simultaneously  
✅ Frontend integration guide is clear and complete  

## Next Steps

Once testing is complete and successful:

1. **Document any issues found** and required config changes
2. **Test with frontend** using the provided React components
3. **Load testing** with multiple devices if available
4. **Monitor performance** under real-world conditions
5. **Consider adding authentication** if needed in future

## Support

If you encounter issues:

1. Check backend logs for errors
2. Verify device commissioning settings
3. Test with simple HTML page before complex frontend
4. Review this guide's troubleshooting section
5. Check that clip download (port 32325) still works

