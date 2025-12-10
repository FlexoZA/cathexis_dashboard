import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.CWE_MVR_API_KEY
const BACKEND_BASE_URL = process.env.CWE_MVR_API_URL

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY || !BACKEND_BASE_URL) {
      console.log("DEBUG::StreamStopAPI", "Error:", "Missing API config", { hasApiKey: Boolean(API_KEY), hasBackendUrl: Boolean(BACKEND_BASE_URL) })
      return NextResponse.json(
        { ok: false, error: 'API configuration not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { serial, camera, profile } = body

    console.log("DEBUG::StreamStopAPI", "Stopping stream:", { serial, camera, profile })

    // Call the backend server directly for stop command
    const backendUrl = `${BACKEND_BASE_URL}/api/units/${encodeURIComponent(serial)}/stream/stop`
    console.log("DEBUG::StreamStopAPI", "Backend URL:", backendUrl)

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        camera,
        profile
      })
    })

    const data = await response.json()
    console.log("DEBUG::StreamStopAPI", "Backend response:", data)

    return NextResponse.json(data)
  } catch (error: any) {
    console.log("DEBUG::StreamStopAPI", "Error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to stop stream' },
      { status: 500 }
    )
  }
}

