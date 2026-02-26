import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = process.env.CWE_MVR_API_URL
const API_KEY = process.env.CWE_MVR_API_KEY

export async function GET(request: NextRequest, context: { params: Promise<{ serial: string }> }) {
  try {
    if (!BACKEND_BASE_URL || !API_KEY) {
      console.log("DEBUG::SdHealthAPI", {
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

    const url = `${BACKEND_BASE_URL.replace(/\/$/, '')}/api/units/${encodeURIComponent(serial)}/sd-health`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      cache: 'no-store',
    })

    const data = await response.json().catch(() => null)
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.log("DEBUG::SdHealthAPI", {
      action: 'sd_health_error',
      error: error?.message || 'Unknown error',
    })
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to fetch SD health' },
      { status: 500 }
    )
  }
}
