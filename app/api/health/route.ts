import { NextResponse } from 'next/server'

const BACKEND_BASE_URL = process.env.CWE_MVR_API_URL

export async function GET() {
  try {
    if (!BACKEND_BASE_URL) {
      console.log("DEBUG::HealthAPI", {
        action: 'missing_config',
        hasBackendUrl: Boolean(BACKEND_BASE_URL),
      })

      return NextResponse.json(
        { ok: false, healthy: false, error: 'API configuration not configured' },
        { status: 500 }
      )
    }

    const url = `${BACKEND_BASE_URL.replace(/\/$/, '')}/health`
    const response = await fetch(url, { method: 'GET', cache: 'no-store' })

    const contentType = response.headers.get('content-type') || ''
    const body = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null)

    return NextResponse.json(
      { ok: response.ok, healthy: response.ok, status: response.status, body },
      { status: response.ok ? 200 : 503 }
    )
  } catch (error: any) {
    console.log("DEBUG::HealthAPI", {
      action: 'health_check_error',
      error: error?.message || 'Unknown error',
    })

    return NextResponse.json(
      { ok: false, healthy: false, error: error?.message || 'Failed health check' },
      { status: 500 }
    )
  }
}

