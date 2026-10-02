import { describe, expect, it, vi } from 'vitest'

import { ApiConnectionError, createApiClient } from './api'

describe('MAREA API client', () => {
  it('consults the backend health endpoint and returns its response', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok', service: 'marea-api', environment: 'development' }), {
        status: 200,
      }),
    )

    const health = await createApiClient('http://localhost:8000/').getHealth(fetcher)

    expect(fetcher).toHaveBeenCalledWith('http://localhost:8000/health')
    expect(health).toEqual({ status: 'ok', service: 'marea-api', environment: 'development' })
  })

  it('hides transport details when the backend cannot be reached', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('socket failure'))

    await expect(createApiClient().getHealth(fetcher)).rejects.toBeInstanceOf(ApiConnectionError)
  })

  it('treats unsuccessful backend responses as connection errors', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 503 }))

    await expect(createApiClient().getHealth(fetcher)).rejects.toBeInstanceOf(ApiConnectionError)
  })
})
