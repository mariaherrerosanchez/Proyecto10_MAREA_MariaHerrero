import { describe, expect, it } from 'vitest'

import type { GenerationFormValues, GenerationResponse, MultichannelGenerationResponse } from '../../generation/types'
import {
  generationReducer,
  addNiche,
  createInitialFormValues,
  initialFormValues,
  initialGenerationState,
  serializeGenerationRequest,
  serializeMultichannelGenerationRequest,
  selectAllPlatforms,
  removeNiche,
  toggleNiche,
  toggleSelectedPlatform,
  validateGenerationForm,
} from './formState'

function validValues(): GenerationFormValues {
  return {
    ...initialFormValues,
    topic: 'Explicar innovación con tildes',
    objective: 'Divulgación',
    audience: 'Profesionales no técnicos',
    tone: 'Cercano y profesional',
    selectedPlatforms: ['linkedin', 'blog'],
    activePlatform: 'linkedin',
  }
}

const response: GenerationResponse = {
  text: 'Borrador',
  provider: 'fake',
  model: 'fake-model',
  processing_location: 'external',
  trace: {
    prompt_version: 'v7',
    context: {
      topic: 'Tema', objective: 'Informar', audience: 'Audiencia', tone: 'Claro', language: 'es', platform: 'blog',
      model_selection: 'primary', niches: [], subniche: null, additional_context: null, profile_context: null,
    },
  },
  guardrails: { findings: [], review_required: false },
}

const multichannelResponse: MultichannelGenerationResponse = {
  results: [
    { status: 'success', platform: 'linkedin', generation: response },
    {
      status: 'error',
      platform: 'blog',
      error: { code: 'provider_request_failed', detail: 'Inténtalo de nuevo.' },
    },
  ],
}

describe('generation form state', () => {
  it('requires the core request fields and a selected platform, but not niche or subniche', () => {
    expect(validateGenerationForm(initialFormValues)).toMatchObject({
      topic: expect.any(String), objective: expect.any(String), audience: expect.any(String), tone: expect.any(String), platforms: expect.any(String),
    })
    expect(validateGenerationForm(validValues())).toEqual({})
  })

  it('restores the complete session draft when Crear is mounted again after navigating through Radar', () => {
    const sessionDraft = {
      ...validValues(),
      modelSelection: 'tertiary' as const,
      additionalContext: 'Explica los límites.',
      niches: ['Inteligencia Artificial', 'QA / Testing'],
      subniche: 'Evaluación de sistemas de IA',
    }
    const initialValues = createInitialFormValues(undefined, sessionDraft)
    initialValues.niches.push('Cambio local')
    initialValues.selectedPlatforms.pop()
    const restoredValues = createInitialFormValues(undefined, sessionDraft)

    expect(restoredValues).toMatchObject(sessionDraft)
    expect(restoredValues.niches).toEqual(['Inteligencia Artificial', 'QA / Testing'])
    expect(restoredValues.selectedPlatforms).toEqual(['linkedin', 'blog'])
  })

  it('applies RSS inspiration without losing the existing draft or duplicating its reference', () => {
    const sessionDraft = {
      ...validValues(),
      additionalContext: 'Mantén el enfoque práctico.',
      niches: ['Tecnología'],
      subniche: 'IA responsable',
    }
    const inspiration = {
      topic: 'Una noticia RSS sobre IA',
      additionalContext: 'Fuente: RSS\nEnlace original: https://example.test/noticia',
    }

    const withInspiration = createInitialFormValues(inspiration, sessionDraft)
    const selectedAgain = createInitialFormValues(inspiration, withInspiration)

    expect(withInspiration).toMatchObject({
      topic: inspiration.topic,
      objective: sessionDraft.objective,
      audience: sessionDraft.audience,
      tone: sessionDraft.tone,
      language: sessionDraft.language,
      modelSelection: sessionDraft.modelSelection,
      niches: ['Tecnología'],
      subniche: 'IA responsable',
      selectedPlatforms: sessionDraft.selectedPlatforms,
      activePlatform: sessionDraft.activePlatform,
    })
    expect(withInspiration.additionalContext).toBe(
      'Mantén el enfoque práctico.\n\nFuente: RSS\nEnlace original: https://example.test/noticia',
    )
    expect(selectedAgain.additionalContext).toBe(withInspiration.additionalContext)
  })

  it('serializes optional fields only when they contain meaningful values', () => {
    expect(serializeGenerationRequest(validValues())).toEqual({
      topic: 'Explicar innovación con tildes', objective: 'Divulgación', audience: 'Profesionales no técnicos', tone: 'Cercano y profesional', language: 'es', model_selection: 'primary', platform: 'linkedin', niches: [],
    })
    expect(serializeGenerationRequest({ ...validValues(), niches: ['Inteligencia Artificial', 'QA / Testing'], subniche: ' IA ', additionalContext: 'Usa un ejemplo.' })).toMatchObject({
      niches: ['Inteligencia Artificial', 'QA / Testing'], subniche: 'IA', additional_context: 'Usa un ejemplo.',
    })
  })

  it('serializes every selected platform for multichannel generation', () => {
    const values = { ...validValues(), modelSelection: 'tertiary' as const }

    expect(serializeMultichannelGenerationRequest(values)).toMatchObject({
      platforms: ['linkedin', 'blog'],
      model_selection: 'tertiary',
      niches: [],
    })
    expect(() => serializeMultichannelGenerationRequest(initialFormValues)).toThrow()
  })

  it('replaces only one platform result after an individual regeneration', () => {
    const initial = {
      status: 'success' as const,
      error: null,
      result: {
        results: [
          { status: 'success' as const, platform: 'linkedin' as const, generation: response },
          { status: 'error' as const, platform: 'instagram' as const, error: { code: 'provider_request_failed', detail: 'Error seguro.' } },
        ],
      },
    }
    const regenerated = { ...response, text: 'Nueva pieza para Instagram.' }

    const next = generationReducer(initial, {
      type: 'replace-platform',
      platform: 'instagram',
      generation: regenerated,
    })

    expect(next.result?.results).toEqual([
      initial.result.results[0],
      { status: 'success', platform: 'instagram', generation: regenerated },
    ])
  })

  it('selects, deselects and de-duplicates suggested or custom niches', () => {
    const withFirstNiche = addNiche(validValues(), ' Inteligencia Artificial ')
    const withSecondNiche = toggleNiche(withFirstNiche, 'QA / Testing')
    const withoutDuplicate = addNiche(withSecondNiche, 'inteligencia artificial')
    const afterRemovingOne = removeNiche(withoutDuplicate, 'INTELIGENCIA ARTIFICIAL')

    expect(withoutDuplicate.niches).toEqual(['Inteligencia Artificial', 'QA / Testing'])
    expect(afterRemovingOne.niches).toEqual(['QA / Testing'])
    expect(toggleNiche(afterRemovingOne, 'QA / Testing').niches).toEqual([])
  })

  it('keeps multiple targets while selecting a valid active platform', () => {
    const selected = toggleSelectedPlatform(initialFormValues, 'linkedin')
    const withSecond = toggleSelectedPlatform(selected, 'blog')
    const afterRemovingActive = toggleSelectedPlatform(withSecond, 'linkedin')

    expect(withSecond.selectedPlatforms).toEqual(['linkedin', 'blog'])
    expect(withSecond.activePlatform).toBe('linkedin')
    expect(afterRemovingActive).toMatchObject({ selectedPlatforms: ['blog'], activePlatform: 'blog' })
  })

  it('selects every available platform while preserving the active platform', () => {
    const selected = selectAllPlatforms(validValues())

    expect(selected.selectedPlatforms).toEqual(['linkedin', 'instagram', 'facebook', 'blog'])
    expect(selected.activePlatform).toBe('linkedin')
  })

  it('models idle, loading, success and recoverable error states', () => {
    const loading = generationReducer(initialGenerationState, { type: 'start' })
    const success = generationReducer(loading, { type: 'success', result: multichannelResponse })
    const error = generationReducer(loading, { type: 'error', error: 'Inténtalo de nuevo.' })

    expect(loading.status).toBe('loading')
    expect(success).toMatchObject({ status: 'success', result: multichannelResponse, error: null })
    expect(error).toMatchObject({ status: 'error', result: null, error: 'Inténtalo de nuevo.' })
  })
})
