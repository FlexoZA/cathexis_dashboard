import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = process.env.CWE_MVR_API_URL
const API_KEY = process.env.CWE_MVR_API_KEY

export async function POST(request: NextRequest) {
  try {
    if (!BACKEND_BASE_URL || !API_KEY) {
      console.log("DEBUG::PortTestAPI", {
        action: 'missing_config',
        hasBackendUrl: Boolean(BACKEND_BASE_URL),
        hasApiKey: Boolean(API_KEY),
      })

      return NextResponse.json(
        { ok: false, error: 'API configuration not configured' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const host = typeof body?.host === 'string' && body.host.trim() ? body.host.trim() : 'localhost'

    const url = `${BACKEND_BASE_URL.replace(/\/$/, '')}/api/test/system/port-test`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ host }),
      cache: 'no-store',
    })

    const data = await response.json().catch(() => null)
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.log("DEBUG::PortTestAPI", {
      action: 'port_test_error',
      error: error?.message || 'Unknown error',
    })
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed port test' },
      { status: 500 }
    )
  }
}

