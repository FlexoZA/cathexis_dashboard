import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { serial, camera, profile } = body

    console.log("DEBUG::StreamStopAPI", "Stopping stream:", { serial, camera, profile })

    // Call the backend server directly for stop command
    const backendUrl = `http://185.202.223.35:9000/api/units/${serial}/stream/stop`
    console.log("DEBUG::StreamStopAPI", "Backend URL:", backendUrl)

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        camera,
        profile
      })
    })

    const data = await response.json()
    console.log("DEBUG::StreamStopAPI", "Backend response:", data)

    return NextResponse.json(data)
  } catch (error: any) {
    console.log("DEBUG::StreamStopAPI", "Error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to stop stream' },
      { status: 500 }
    )
  }
}

