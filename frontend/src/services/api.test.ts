import { describe, expect, it, vi } from 'vitest'

import { ApiConnectionError, createApiClient, GenerationRequestError } from './api'

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

  it('sends a structured generation request and returns the normalized response', async () => {
    const body = {
      topic: 'Explicar MAREA',
      objective: 'Divulgación',
      audience: 'Personas no técnicas',
      tone: 'Cercano y profesional',
      language: 'es',
      platform: 'linkedin' as const,
      niches: [],
    }
    const generated = {
      text: 'MAREA ayuda a crear contenido.',
      provider: 'groq',
      model: 'model',
      processing_location: 'external' as const,
      trace: { prompt_version: 'v7', context: { ...body, subniche: null, additional_context: null, profile_context: null } },
      guardrails: { findings: [], review_required: false },
    }
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(generated), { status: 200 }))

    const response = await createApiClient('http://localhost:8000/').generateContent(body, fetcher)

    expect(fetcher).toHaveBeenCalledWith('http://localhost:8000/generation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    expect(response).toEqual(generated)
  })

  it('returns a safe recoverable error when generation fails', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 502 }))

    await expect(createApiClient().generateContent({
      topic: 'Tema', objective: 'Informar', audience: 'Audiencia', tone: 'Claro', language: 'es', platform: 'blog', niches: [],
    }, fetcher)).rejects.toBeInstanceOf(GenerationRequestError)
  })

  it('sends every selected platform to the multichannel endpoint', async () => {
    const body = {
      topic: 'Explicar MAREA', objective: 'Divulgación', audience: 'Personas no técnicas', tone: 'Cercano y profesional', language: 'es', niches: [], platforms: ['linkedin', 'blog'] as Array<'linkedin' | 'blog'>,
    }
    const generated = {
      results: [
        { status: 'success', platform: 'linkedin', generation: { text: 'LinkedIn', provider: 'fake', model: 'fake-model', processing_location: 'external', trace: { prompt_version: 'v7', context: { ...body, platform: 'linkedin', subniche: null, additional_context: null, profile_context: null } }, guardrails: { findings: [], review_required: false } } },
        { status: 'error', platform: 'blog', error: { code: 'provider_request_failed', detail: 'Error seguro.' } },
      ],
    }
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(generated), { status: 200 }))

    const response = await createApiClient('http://localhost:8000/').generateMultichannelContent(body, fetcher)

    expect(fetcher).toHaveBeenCalledWith('http://localhost:8000/generation/multichannel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    expect(response).toEqual(generated)
  })

  it('shows a recognized safe multichannel error from the backend contract', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'provider_not_configured',
      detail: 'La generación aún no está configurada. Revisa el proveedor y el modelo.',
    }), { status: 503 }))

    await expect(createApiClient().generateMultichannelContent({
      topic: 'Tema', objective: 'Informar', audience: 'Audiencia', tone: 'Claro', language: 'es', niches: [], platforms: ['linkedin'],
    }, fetcher)).rejects.toThrow('La generación aún no está configurada. Revisa el proveedor y el modelo.')
  })

  it('keeps the generic message for an unexpected multichannel error response', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'internal_exception',
      detail: 'Traceback: private implementation detail',
    }), { status: 500 }))

    await expect(createApiClient().generateMultichannelContent({
      topic: 'Tema', objective: 'Informar', audience: 'Audiencia', tone: 'Claro', language: 'es', niches: [], platforms: ['instagram'],
    }, fetcher)).rejects.toThrow('No se ha podido generar el borrador. Inténtalo de nuevo.')
  })
})
