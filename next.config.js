/** @type {import('next').NextConfig} */
const fs = require('fs')
const path = require('path')

// Optional environment switch:
// - ENV=staging    -> loads .env.staging.local
// - ENV=production -> loads .env.production.local
//
// Notes:
// - These files are gitignored via .env*.local
// - We only override the core runtime config keys below (Supabase + Gateway)
const envRaw = (process.env.ENV || '').trim().toLowerCase()
const env = envRaw === 'prod' ? 'production' : envRaw === 'stage' ? 'staging' : envRaw

if (env === 'staging' || env === 'production') {
  const envFilePath = path.join(__dirname, `.env.${env}.local`)
  if (fs.existsSync(envFilePath)) {
    const overrideKeys = new Set([
      'CWE_MVR_API_URL',
      'CWE_MVR_API_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ])

    const content = fs.readFileSync(envFilePath, 'utf8')
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue

      const eqIdx = line.indexOf('=')
      if (eqIdx === -1) continue

      const key = line.slice(0, eqIdx).trim()
      if (!overrideKeys.has(key)) continue

      let value = line.slice(eqIdx + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      process.env[key] = value
    }
  }
}

const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig

