import { NextResponse } from 'next/server'

const BACKEND_BASE_URL = process.env.CWE_MVR_API_URL
const API_KEY = process.env.CWE_MVR_API_KEY

export async function GET() {
  try {
    if (!BACKEND_BASE_URL || !API_KEY) {
      console.log("DEBUG::UnitsAPI", {
        action: 'missing_config',
        hasBackendUrl: Boolean(BACKEND_BASE_URL),
        hasApiKey: Boolean(API_KEY),
      })

      return NextResponse.json(
        { ok: false, error: 'API configuration not configured' },
        { status: 500 }
      )
    }

    const url = `${BACKEND_BASE_URL.replace(/\/$/, '')}/api/units`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      cache: 'no-store',
    })

    const data = await response.json()
    console.log("DEBUG::UnitsAPI", {
      action: 'fetch_units',
      status: response.status,
      count: data?.count,
      hasUnits: Array.isArray(data?.units),
    })

    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.log("DEBUG::UnitsAPI", {
      action: 'fetch_units_error',
      error: error?.message || 'Unknown error',
    })

    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to fetch units' },
      { status: 500 }
    )
  }
}

