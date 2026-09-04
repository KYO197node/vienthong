import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

export async function GET() {
  const started = Date.now()
  let db: 'ok' | 'error' = 'ok'
  let dbError: string | null = null
  try {
    const payload = await getPayloadClient()
    await payload.find({ collection: 'categories', limit: 1, depth: 0 })
  } catch (e) {
    db = 'error'
    dbError = e instanceof Error ? e.message : String(e)
  }
  const latency = Date.now() - started
  const status = db === 'ok' ? 200 : 503
  return NextResponse.json(
    {
      status: db === 'ok' ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        db,
        latencyMs: latency,
        ...(dbError ? { dbError } : {}),
      },
    },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}
