#!/usr/bin/env node
/**
 * Sanity-check that NEXT_PUBLIC_SUPABASE_URL matches SUPABASE_PROJECT_ID.
 * Run from an app directory with env vars set (e.g. `export $(grep -v '^#' .env | xargs)`).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const ref = process.env.SUPABASE_PROJECT_ID?.trim()

if (!url || !ref) {
  console.error(
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_PROJECT_ID (new project ref) then re-run.',
  )
  process.exit(1)
}

let host
try {
  host = new URL(url).hostname
} catch {
  console.error('NEXT_PUBLIC_SUPABASE_URL is not a valid URL:', url)
  process.exit(1)
}

const expected = `${ref}.supabase.co`
if (host !== expected) {
  console.error(`Mismatch: URL host "${host}" !== expected "${expected}"`)
  process.exit(1)
}

console.log('OK: NEXT_PUBLIC_SUPABASE_URL matches SUPABASE_PROJECT_ID.')
process.exit(0)
