import { describe, expect, it } from 'vitest'

import type { GenerationResponse, MultichannelGenerationRequest } from '../../generation/types'
import {
  completePlatformRegeneration,
  createRegenerationRequest,
  failPlatformRegeneration,
  hasRegenerationInProgress,
  replacePlatformGeneration,
  startPlatformRegeneration,
} from './regenerationState'

const originalRequest: MultichannelGenerationRequest = {
  topic: 'IA aplicada a QA',
  objective: 'Divulgación',
  audience: 'Profesionales no técnicos',
  tone: 'Cercano y profesional',
  language: 'es',
  model_selection: 'secondary',
  niches: ['Inteligencia Artificial', 'QA / Testing'],
  subniche: 'Evaluación de sistemas de IA',
  additional_context: 'Evitar métricas no verificadas.',
  platforms: ['linkedin', 'instagram'],
}

const regenerated: GenerationResponse = {
  text: 'Nueva pieza.', provider: 'fake', model: 'fake-model', processing_location: 'external',
  trace: { prompt_version: 'v7', context: { ...originalRequest, platform: 'linkedin', subniche: originalRequest.subniche ?? null, additional_context: originalRequest.additional_context ?? null, profile_context: null } },
  guardrails: { findings: [], review_required: false },
}

describe('platform regeneration state', () => {
  it('builds a single-platform request from the original multichannel context', () => {
    expect(createRegenerationRequest(originalRequest, 'instagram')).toEqual({
      topic: 'IA aplicada a QA',
      objective: 'Divulgación',
      audience: 'Profesionales no técnicos',
      tone: 'Cercano y profesional',
      language: 'es',
      model_selection: 'secondary',
      niches: ['Inteligencia Artificial', 'QA / Testing'],
      subniche: 'Evaluación de sistemas de IA',
      additional_context: 'Evitar métricas no verificadas.',
      platform: 'instagram',
    })
  })

  it('tracks loading and error state independently by platform', () => {
    const loading = startPlatformRegeneration({}, 'linkedin')
    const failed = failPlatformRegeneration(loading, 'linkedin', 'Error seguro.')

    expect(hasRegenerationInProgress(loading)).toBe(true)
    expect(failed.linkedin).toEqual({ status: 'error', error: 'Error seguro.' })
    expect(hasRegenerationInProgress(failed)).toBe(false)
    expect(completePlatformRegeneration(failed, 'linkedin')).toEqual({})
  })

  it('replaces only the regenerated platform while preserving result order and others', () => {
    const previous = {
      results: [
        { status: 'success' as const, platform: 'linkedin' as const, generation: { ...regenerated, text: 'Anterior.' } },
        { status: 'error' as const, platform: 'instagram' as const, error: { code: 'provider_request_failed', detail: 'Error seguro.' } },
      ],
    }

    expect(replacePlatformGeneration(previous, 'instagram', regenerated)).toEqual({
      results: [
        previous.results[0],
        { status: 'success', platform: 'instagram', generation: regenerated },
      ],
    })
  })
})
