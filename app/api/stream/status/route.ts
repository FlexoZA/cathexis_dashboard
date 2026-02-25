import { NextRequest, NextResponse } from 'next/server'
import { getCapabilitiesForUnit, normalizeProtocol } from '@/lib/units/registry'

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
    const { serial, camera, profile, capabilities, protocol, deviceModel } = body

    if (!serial) {
      return NextResponse.json({ ok: false, error: 'serial is required' }, { status: 400 })
    }

    if (!Number.isInteger(camera)) {
      return NextResponse.json({ ok: false, error: 'camera must be an integer' }, { status: 400 })
    }

    if (!Number.isInteger(profile)) {
      return NextResponse.json({ ok: false, error: 'profile must be an integer' }, { status: 400 })
    }

    const resolvedCapabilities =
      capabilities && Array.isArray(capabilities?.cameraOptions) && Array.isArray(capabilities?.profileOptions)
        ? capabilities
        : getCapabilitiesForUnit({ serial, deviceModel, protocol: normalizeProtocol(protocol) })

    const cameraOptions: number[] = Array.isArray(resolvedCapabilities?.cameraOptions)
      ? resolvedCapabilities.cameraOptions.map((option: any) => option?.value).filter((value: any) => Number.isInteger(value))
      : []
    const profileOptions: number[] = Array.isArray(resolvedCapabilities?.profileOptions)
      ? resolvedCapabilities.profileOptions.map((option: any) => option?.value).filter((value: any) => Number.isInteger(value))
      : []

    if (cameraOptions.length > 0 && !cameraOptions.includes(camera)) {
      return NextResponse.json({ ok: false, error: `camera ${camera} is not supported for this unit` }, { status: 400 })
    }

    if (profileOptions.length > 0 && !profileOptions.includes(profile)) {
      return NextResponse.json({ ok: false, error: `profile ${profile} is not supported for this unit` }, { status: 400 })
    }

    console.log("DEBUG::StreamStatusAPI", "Checking stream status:", { serial, camera, profile })

    // Call the backend server directly for status (GET request with query params)
    const backendUrl = `${BACKEND_BASE_URL}/api/units/${encodeURIComponent(serial)}/stream/status?camera=${camera}&profile=${profile}`
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
    console.log("DEBUG::StreamStatusAPI", "Error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to get stream status' },
      { status: 500 }
    )
  }
}

