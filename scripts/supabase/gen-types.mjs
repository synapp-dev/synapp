#!/usr/bin/env node
/**
 * Generates types/supabase.ts using Supabase CLI from the repo root install.
 * Requires SUPABASE_PROJECT_ID (project ref from https://<ref>.supabase.co).
 *
 * Usage (from an app directory): node ../../scripts/supabase/gen-types.mjs
 * Optional: SUPABASE_TYPES_SCHEMA (default public), SUPABASE_TYPES_OUT (default types/supabase.ts)
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectId = process.env.SUPABASE_PROJECT_ID?.trim()
if (!projectId || projectId === 'YOUR_PROJECT_ID') {
  console.error(
    'Set SUPABASE_PROJECT_ID to your Supabase project ref (e.g. from Dashboard URL).',
  )
  process.exit(1)
}

const schema = process.env.SUPABASE_TYPES_SCHEMA?.trim() || 'public'
const outRel = process.env.SUPABASE_TYPES_OUT?.trim() || 'types/supabase.ts'
const outPath = path.resolve(process.cwd(), outRel)

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..')
const binDir = path.join(repoRoot, 'node_modules', '.bin')
const winCmd = path.join(binDir, 'supabase.cmd')
const unixBin = path.join(binDir, 'supabase')
const supabaseBin =
  process.platform === 'win32' && fs.existsSync(winCmd)
    ? winCmd
    : fs.existsSync(unixBin)
      ? unixBin
      : winCmd

if (!fs.existsSync(supabaseBin)) {
  console.error(
    'Supabase CLI not found under node_modules/.bin — run pnpm install at the repository root.',
  )
  process.exit(1)
}

const stdout = execFileSync(
  supabaseBin,
  ['gen', 'types', 'typescript', `--project-id=${projectId}`, `--schema=${schema}`],
  { encoding: 'utf8', cwd: process.cwd(), maxBuffer: 50 * 1024 * 1024 },
)

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, stdout, 'utf8')
console.log('Wrote', outPath)
