#!/usr/bin/env node
/**
 * Applies a SQL migration file to the database in DATABASE_URL.
 * Reads DATABASE_URL from the environment, falling back to .env.local in cwd.
 *
 * Usage (from an app directory):
 *   node ../../scripts/supabase/apply-migration.mjs supabase/migrations/<file>.sql
 *
 * Uses the app's own `postgres` dependency (resolved from cwd).
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const fileArg = process.argv[2]
if (!fileArg) {
  console.error('Usage: apply-migration.mjs <path-to-sql-file>')
  process.exit(1)
}

const sqlPath = path.resolve(process.cwd(), fileArg)
if (!fs.existsSync(sqlPath)) {
  console.error('SQL file not found:', sqlPath)
  process.exit(1)
}

let databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^DATABASE_URL\s*=\s*(.+)$/)
      if (match) {
        databaseUrl = match[1].trim().replace(/^["']|["']$/g, '')
        break
      }
    }
  }
}
if (!databaseUrl) {
  console.error('DATABASE_URL not set (env or .env.local in cwd).')
  process.exit(1)
}

const require = createRequire(path.join(process.cwd(), 'package.json'))
const postgres = require('postgres')

const sql = postgres(databaseUrl, { max: 1, prepare: false })
const content = fs.readFileSync(sqlPath, 'utf8')

try {
  await sql.unsafe(content).simple()
  console.log('Applied', path.basename(sqlPath))
} finally {
  await sql.end()
}
