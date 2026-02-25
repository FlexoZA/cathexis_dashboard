import { NextRequest, NextResponse } from 'next/server'
import { getCapabilitiesForUnit, normalizeProtocol } from '@/lib/units/registry'

const BACKEND_BASE_URL = process.env.CWE_MVR_API_URL
const API_KEY = process.env.CWE_MVR_API_KEY

function buildClipRequestUrl(serial: string) {
  return `${BACKEND_BASE_URL}/api/units/${encodeURIComponent(serial)}/clips/request`
}

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY || !BACKEND_BASE_URL) {
      console.log("DEBUG::ClipRequestAPI", { action: 'request_clip_error', error: 'Missing API config', hasApiKey: Boolean(API_KEY), hasBackendUrl: Boolean(BACKEND_BASE_URL) })
      return NextResponse.json(
        { ok: false, error: 'API configuration not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { serial, camera, profile, start_utc, end_utc, capabilities, protocol, deviceModel } = body || {}

    if (!serial) {
      return NextResponse.json(
        { ok: false, error: 'serial is required' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(camera)) {
      return NextResponse.json(
        { ok: false, error: 'camera must be an integer' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(profile)) {
      return NextResponse.json(
        { ok: false, error: 'profile must be an integer' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { ok: false, error: `camera ${camera} is not supported for this unit` },
        { status: 400 }
      )
    }

    if (profileOptions.length > 0 && !profileOptions.includes(profile)) {
      return NextResponse.json(
        { ok: false, error: `profile ${profile} is not supported for this unit` },
        { status: 400 }
      )
    }

    if (!start_utc || !end_utc) {
      return NextResponse.json(
        { ok: false, error: 'start_utc and end_utc are required' },
        { status: 400 }
      )
    }

    console.log("DEBUG::ClipRequestAPI", { action: 'request_clip', serial, camera, profile, start_utc, end_utc })

    const response = await fetch(buildClipRequestUrl(serial), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        camera,
        profile,
        start_utc,
        end_utc,
      }),
    })

    const data = await response.json()
    console.log("DEBUG::ClipRequestAPI", { action: 'request_clip_result', serial, data })

    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.log("DEBUG::ClipRequestAPI", { action: 'request_clip_error', error })
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to request clip' },
      { status: 500 }
    )
  }
}


