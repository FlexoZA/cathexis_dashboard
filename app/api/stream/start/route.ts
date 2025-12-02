import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { serial, camera, profile, period = 0 } = body

    console.log("DEBUG::StreamStartAPI", "Starting stream:", { serial, camera, profile, period })

    // Call the backend server directly for start command
    const backendUrl = `http://185.202.223.35:9000/api/units/${serial}/stream/start`
    console.log("DEBUG::StreamStartAPI", "Backend URL:", backendUrl)

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        camera,
        profile,
        period
      })
    })

    const data = await response.json()
    console.log("DEBUG::StreamStartAPI", "Backend response:", data)

    return NextResponse.json(data)
  } catch (error: any) {
    console.log("DEBUG::StreamStartAPI", "Error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to start stream' },
      { status: 500 }
    )
  }
}

