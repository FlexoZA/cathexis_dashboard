import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = process.env.CWE_MVR_API_URL
const API_KEY = process.env.CWE_MVR_API_KEY

interface BatchCommand {
  key: string
  type: string
  payload?: Record<string, unknown>
}

interface CommandResult {
  ok: boolean
  data: unknown
  error: string | null
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ serial: string }> }
) {
  try {
    if (!BACKEND_BASE_URL || !API_KEY) {
      console.log('DEBUG::N62BatchAPI', {
        action: 'missing_config',
        hasBackendUrl: Boolean(BACKEND_BASE_URL),
        hasApiKey: Boolean(API_KEY),
      })
      return NextResponse.json({ ok: false, error: 'API not configured' }, { status: 500 })
    }

    const { serial } = await context.params
    if (!serial) {
      return NextResponse.json({ ok: false, error: 'Missing serial' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const commands: BatchCommand[] = body.commands ?? []

    if (!Array.isArray(commands) || commands.length === 0) {
      return NextResponse.json({ ok: false, error: 'commands array required' }, { status: 400 })
    }

    const base = BACKEND_BASE_URL.replace(/\/$/, '')
    const commandUrl = `${base}/api/units/${encodeURIComponent(serial)}/command`
    const sdHealthUrl = `${base}/api/units/${encodeURIComponent(serial)}/sd-health`
    const authHeaders = { Authorization: `Bearer ${API_KEY}` }

    console.log('DEBUG::N62BatchAPI', {
      action: 'batch_start',
      serial,
      commandCount: commands.length,
      keys: commands.map((c) => c.key),
    })

    const settled = await Promise.allSettled(
      commands.map(async (cmd): Promise<{ key: string } & CommandResult> => {
        try {
          if (cmd.type === 'sd_health') {
            const res = await fetch(sdHealthUrl, {
              headers: authHeaders,
              cache: 'no-store',
            })
            const json = await res.json().catch(() => null)
            if (!res.ok) {
              return {
                key: cmd.key,
                ok: false,
                data: null,
                error: json?.error ?? `SD health failed (${res.status})`,
              }
            }
            // Merge stale/age_ms into data so the view can access them uniformly
            const merged = json?.data
              ? { ...json.data, stale: json.stale, age_ms: json.age_ms }
              : null
            return { key: cmd.key, ok: true, data: merged, error: null }
          }

          const cmdBody: Record<string, unknown> = { type: cmd.type }
          if (cmd.payload) cmdBody.payload = cmd.payload

          const res = await fetch(commandUrl, {
            method: 'POST',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify(cmdBody),
            cache: 'no-store',
          })
          const json = await res.json().catch(() => null)

          if (!res.ok || json?.ok === false) {
            return {
              key: cmd.key,
              ok: false,
              data: null,
              error: json?.error ?? `Command failed (${res.status})`,
            }
          }
          // request_config nests the actual fields inside data.payload;
          // other commands (request_environment, request_vehicle_info) return flat data
          const raw = json?.data ?? null
          const data = raw?.payload ?? raw
          return { key: cmd.key, ok: true, data, error: null }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          return { key: cmd.key, ok: false, data: null, error: msg }
        }
      })
    )

    const results: Record<string, CommandResult> = {}
    for (const r of settled) {
      if (r.status === 'fulfilled') {
        const { key, ...rest } = r.value
        results[key] = rest
      }
    }

    console.log('DEBUG::N62BatchAPI', {
      action: 'batch_complete',
      serial,
      succeeded: Object.values(results).filter((r) => r.ok).length,
      failed: Object.values(results).filter((r) => !r.ok).length,
    })

    return NextResponse.json({ ok: true, serial, results })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.log('DEBUG::N62BatchAPI', { action: 'batch_error', error: msg })
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
