import { createFileRoute } from '@tanstack/react-router'

const SHARED_SECRET = '5839b5e6346c5ad604503fb5bbf3d0e54a6407eec7759a4c'
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

export const Route = createFileRoute('/api/public/ai-proxy')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get('authorization') ?? ''
        if (auth !== `Bearer ${SHARED_SECRET}`) {
          return new Response('Forbidden', { status: 403 })
        }

        const lovableKey = process.env.LOVABLE_API_KEY
        if (!lovableKey) {
          return new Response(
            JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
            { status: 500, headers: { 'content-type': 'application/json' } },
          )
        }

        const body = await request.text()

        const upstream = await fetch(GATEWAY_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${lovableKey}`,
          },
          body,
        })

        const respBody = await upstream.text()
        return new Response(respBody, {
          status: upstream.status,
          headers: {
            'content-type':
              upstream.headers.get('content-type') ?? 'application/json',
          },
        })
      },
    },
  },
})
