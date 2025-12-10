import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.CWE_MVR_API_KEY
const BACKEND_BASE_URL = process.env.CWE_MVR_API_URL

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY || !BACKEND_BASE_URL) {
      console.log("DEBUG::StreamStatusAPI", "Error:", "Missing API config", { hasApiKey: Boolean(API_KEY), hasBackendUrl: Boolean(BACKEND_BASE_URL) })
      return NextResponse.json(
        { ok: false, error: 'API configuration not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { serial, camera, profile } = body

    console.log("DEBUG::StreamStatusAPI", "Checking stream status:", { serial, camera, profile })

    // Call the backend server directly for status (GET request with query params)
    const backendUrl = `${BACKEND_BASE_URL}/api/units/${encodeURIComponent(serial)}/stream/status?camera=${camera}&profile=${profile}`
    console.log("DEBUG::StreamStatusAPI", "Backend URL:", backendUrl)
    console.log("DEBUG::StreamStatusAPI", "Backend URL:", backendUrl)

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      }
    })

    const data = await response.json()
    console.log("DEBUG::StreamStatusAPI", "Backend response:", data)

    return NextResponse.json(data)
  } catch (error: any) {
    console.log("DEBUG::StreamStatusAPI", "Error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to get stream status' },
      { status: 500 }
    )
  }
}

