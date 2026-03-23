// app/api/missions/stream/route.ts
// Server-Sent Events endpoint — drivers connect here for instant mission updates

import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// In-process registry of active SSE writers
// (works within a single serverless instance; OneSignal push covers cross-instance)
const clients = new Set<(data: string) => void>()

export function notifyClients() {
  const msg = `data: refresh\n\n`
  clients.forEach(send => send(msg))
}

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial keepalive
      controller.enqueue(encoder.encode(': connected\n\n'))

      const send = (data: string) => {
        try { controller.enqueue(encoder.encode(data)) } catch { /* client gone */ }
      }

      clients.add(send)

      // Keepalive ping every 25s to prevent proxy timeouts
      const ping = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')) }
        catch { clearInterval(ping); clients.delete(send) }
      }, 25_000)

      // Clean up when client disconnects
      _req.signal.addEventListener('abort', () => {
        clearInterval(ping)
        clients.delete(send)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
