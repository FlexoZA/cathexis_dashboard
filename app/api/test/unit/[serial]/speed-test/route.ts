import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = process.env.CWE_MVR_API_URL
const API_KEY = process.env.CWE_MVR_API_KEY

export async function POST(request: NextRequest, context: { params: Promise<{ serial: string }> }) {
  try {
    if (!BACKEND_BASE_URL || !API_KEY) {
      console.log("DEBUG::UnitSpeedTestAPI", {
        action: 'missing_config',
        hasBackendUrl: Boolean(BACKEND_BASE_URL),
        hasApiKey: Boolean(API_KEY),
      })

      return NextResponse.json(
        { ok: false, error: 'API configuration not configured' },
        { status: 500 }
      )
    }

    const { serial } = await context.params
    if (!serial) {
      return NextResponse.json({ ok: false, error: 'Missing serial' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const camera = typeof body?.camera === 'number' ? body.camera : Number(body?.camera)
    const profile = typeof body?.profile === 'number' ? body.profile : Number(body?.profile)

    if (!Number.isFinite(camera) || !Number.isFinite(profile)) {
      return NextResponse.json({ ok: false, error: 'Invalid camera/profile' }, { status: 400 })
    }

    const url = `${BACKEND_BASE_URL.replace(/\/$/, '')}/api/test/unit/${encodeURIComponent(serial)}/speed-test`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ camera, profile }),
      cache: 'no-store',
    })

    const data = await response.json().catch(() => null)
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.log("DEBUG::UnitSpeedTestAPI", {
      action: 'speed_test_error',
      error: error?.message || 'Unknown error',
    })
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed speed test' },
      { status: 500 }
    )
  }
}

