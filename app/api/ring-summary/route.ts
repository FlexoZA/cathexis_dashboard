import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = process.env.CWE_MVR_API_URL
const API_KEY = process.env.CWE_MVR_API_KEY

function buildCommandUrl(serial: string) {
  return `${BACKEND_BASE_URL}/api/units/${encodeURIComponent(serial)}/command`
}

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY || !BACKEND_BASE_URL) {
      console.log("DEBUG::RingSummaryAPI", { action: 'request_ring_summary_error', error: 'Missing API config', hasApiKey: Boolean(API_KEY), hasBackendUrl: Boolean(BACKEND_BASE_URL) })
      return NextResponse.json(
        { ok: false, error: 'API configuration not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { serial, camera, profile } = body || {}

    if (!serial) {
      return NextResponse.json(
        { ok: false, error: 'serial is required' },
        { status: 400 }
      )
    }

    if (camera === undefined || camera === null) {
      return NextResponse.json(
        { ok: false, error: 'camera is required' },
        { status: 400 }
      )
    }

    console.log("DEBUG::RingSummaryAPI", { action: 'request_ring_summary', serial, camera, profile })

    const response = await fetch(buildCommandUrl(serial), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        type: 'request_ring_summary',
        payload: {
          camera,
          profile,
        },
      }),
    })

    const data = await response.json()
    console.log("DEBUG::RingSummaryAPI", { action: 'request_ring_summary_result', serial, data })

    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.log("DEBUG::RingSummaryAPI", { action: 'request_ring_summary_error', error })
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to fetch ring summary' },
      { status: 500 }
    )
  }
}


