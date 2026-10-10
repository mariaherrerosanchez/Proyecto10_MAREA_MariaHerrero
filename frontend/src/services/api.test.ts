import { describe, expect, it, vi } from 'vitest'

import { ApiConnectionError, createApiClient, GenerationRequestError, RadarRequestError } from './api'

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

  it('lists configured public model options without exposing credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { selection: 'primary', provider: 'groq', model: 'openai/gpt-oss-20b', processing_location: 'external' },
      { selection: 'secondary', provider: 'groq', model: 'qwen/qwen3.8-27b', processing_location: 'external' },
      { selection: 'tertiary', provider: 'groq', model: 'openai/gpt-oss-120b', processing_location: 'external' },
    ]), { status: 200 }))

    const models = await createApiClient('http://localhost:8000').getGenerationModels(fetcher)

    expect(fetcher).toHaveBeenCalledWith('http://localhost:8000/generation/models')
    expect(models).toHaveLength(3)
    expect(models[1]).toMatchObject({ selection: 'secondary', model: 'qwen/qwen3.8-27b' })
  })

  it('keeps catalog loading errors recoverable and does not expose response details', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      detail: 'private upstream detail',
    }), { status: 500 }))

    await expect(createApiClient().getGenerationModels(fetcher)).rejects.toBeInstanceOf(ApiConnectionError)
  })

  it('rejects malformed model catalog data instead of rendering unknown selections', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { selection: 'automatic', provider: 'groq', model: 'unverified', processing_location: 'external' },
    ]), { status: 200 }))

    await expect(createApiClient().getGenerationModels(fetcher)).rejects.toBeInstanceOf(ApiConnectionError)
  })

  it('retrieves validated Radar RSS metadata without treating it as generated content', async () => {
    const radarResponse = {
      items: [{
        title: 'Titular RSS',
        source_id: 'elpais-tecnologia',
        source_name: 'EL PAÍS · Tecnología',
        published_at: '2026-10-10T08:00:00Z',
        original_url: 'https://elpais.com/tecnologia/example.html',
        fetched_at: '2026-10-10T09:00:00Z',
      }],
      sources: [{
        source_id: 'elpais-tecnologia',
        source_name: 'EL PAÍS · Tecnología',
        status: 'success',
        fetched_at: '2026-10-10T09:00:00Z',
        error_code: null,
      }],
      fetched_at: '2026-10-10T09:00:00Z',
    }
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(radarResponse), { status: 200 }))

    await expect(createApiClient('http://localhost:8000').getRadarNews(fetcher)).resolves.toEqual(radarResponse)
    expect(fetcher).toHaveBeenCalledWith('http://localhost:8000/radar/news')
  })

  it('keeps Radar errors recoverable when its response is malformed or unavailable', async () => {
    const malformedFetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }))
    const unavailableFetcher = vi.fn().mockResolvedValue(new Response(null, { status: 503 }))
    const invalidJsonFetcher = vi.fn().mockResolvedValue(new Response('{', { status: 200 }))
    const unsafeUrlFetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{
        title: 'Unsafe', source_id: 'elpais-tecnologia', source_name: 'EL PAÍS · Tecnología',
        published_at: null, original_url: 'javascript:alert(1)', fetched_at: '2026-10-10T09:00:00Z',
      }],
      sources: [],
      fetched_at: '2026-10-10T09:00:00Z',
    }), { status: 200 }))

    await expect(createApiClient().getRadarNews(malformedFetcher)).rejects.toBeInstanceOf(RadarRequestError)
    await expect(createApiClient().getRadarNews(unavailableFetcher)).rejects.toBeInstanceOf(RadarRequestError)
    await expect(createApiClient().getRadarNews(invalidJsonFetcher)).rejects.toBeInstanceOf(RadarRequestError)
    await expect(createApiClient().getRadarNews(unsafeUrlFetcher)).rejects.toBeInstanceOf(RadarRequestError)
  })

  it('sends a structured generation request and returns the normalized response', async () => {
    const body = {
      topic: 'Explicar MAREA',
      objective: 'Divulgación',
      audience: 'Personas no técnicas',
      tone: 'Cercano y profesional',
      language: 'es',
      model_selection: 'primary' as const,
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
      topic: 'Tema', objective: 'Informar', audience: 'Audiencia', tone: 'Claro', language: 'es', model_selection: 'primary', platform: 'blog', niches: [],
    }, fetcher)).rejects.toBeInstanceOf(GenerationRequestError)
  })

  it('sends every selected platform to the multichannel endpoint', async () => {
    const body = {
      topic: 'Explicar MAREA', objective: 'Divulgación', audience: 'Personas no técnicas', tone: 'Cercano y profesional', language: 'es', model_selection: 'primary' as const, niches: [], platforms: ['linkedin', 'blog'] as Array<'linkedin' | 'blog'>,
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
      topic: 'Tema', objective: 'Informar', audience: 'Audiencia', tone: 'Claro', language: 'es', model_selection: 'primary', niches: [], platforms: ['linkedin'],
    }, fetcher)).rejects.toThrow('La generación aún no está configurada. Revisa el proveedor y el modelo.')
  })

  it('keeps the generic message for an unexpected multichannel error response', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'internal_exception',
      detail: 'Traceback: private implementation detail',
    }), { status: 500 }))

    await expect(createApiClient().generateMultichannelContent({
      topic: 'Tema', objective: 'Informar', audience: 'Audiencia', tone: 'Claro', language: 'es', model_selection: 'primary', niches: [], platforms: ['instagram'],
    }, fetcher)).rejects.toThrow('No se ha podido generar el borrador. Inténtalo de nuevo.')
  })
})
