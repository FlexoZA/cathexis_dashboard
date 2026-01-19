import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.CWE_MVR_API_KEY
const BACKEND_BASE_URL = process.env.CWE_MVR_API_URL

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY || !BACKEND_BASE_URL) {
      console.log("DEBUG::StreamStartAPI", "Error:", "Missing API config", { hasApiKey: Boolean(API_KEY), hasBackendUrl: Boolean(BACKEND_BASE_URL) })
      return NextResponse.json(
        { ok: false, error: 'API configuration not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { serial, camera, profile, period = 0 } = body

    console.log("DEBUG::StreamStartAPI", "Starting stream:", { serial, camera, profile, period })

    // Call the backend server directly for start command
    const backendUrl = `${BACKEND_BASE_URL}/api/units/${encodeURIComponent(serial)}/stream/start`
    console.log("DEBUG::StreamStartAPI", "Backend URL:", backendUrl)

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        camera,
        profile,
        period
      })
    })

    const data = await response.json()
    console.log("DEBUG::StreamStartAPI", "Backend response:", data)

    // Provide an absolute HLS URL for the browser (client components can't read non-NEXT_PUBLIC envs).
    const hlsBaseUrl = BACKEND_BASE_URL.replace(/\/$/, '')
    const streamUrlRaw = typeof data?.stream_url === 'string' ? data.stream_url : null
    const streamUrlFull = streamUrlRaw ? new URL(streamUrlRaw, hlsBaseUrl).toString() : null

    return NextResponse.json({
      ...data,
      hls_base_url: hlsBaseUrl,
      stream_url_full: streamUrlFull,
    })
  } catch (error: any) {
    console.log("DEBUG::StreamStartAPI", "Error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to start stream' },
      { status: 500 }
    )
  }
}

