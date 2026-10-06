import type { GenerationFormValues, GenerationRequest, GenerationResponse, Platform } from '../../generation/types'

export type FormErrors = Partial<Record<'topic' | 'objective' | 'audience' | 'tone' | 'language' | 'platforms', string>>

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error'

export type GenerationState = {
  status: GenerationStatus
  result: GenerationResponse | null
  error: string | null
}

export const initialFormValues: GenerationFormValues = {
  topic: '',
  objective: '',
  audience: '',
  tone: '',
  language: 'es',
  additionalContext: '',
  niches: [],
  subniche: '',
  selectedPlatforms: [],
  activePlatform: null,
}

export const initialGenerationState: GenerationState = {
  status: 'idle',
  result: null,
  error: null,
}

export function validateGenerationForm(values: GenerationFormValues): FormErrors {
  const requiredFields = [
    ['topic', values.topic, 'Escribe el tema o idea.'],
    ['objective', values.objective, 'Selecciona un objetivo.'],
    ['audience', values.audience, 'Indica para quién creas el contenido.'],
    ['tone', values.tone, 'Selecciona un tono.'],
    ['language', values.language, 'Selecciona un idioma.'],
  ] as const

  const errors: FormErrors = {}
  for (const [field, value, message] of requiredFields) {
    if (!value.trim()) {
      errors[field] = message
    }
  }
  if (values.selectedPlatforms.length === 0 || values.activePlatform === null) {
    errors.platforms = 'Selecciona al menos una plataforma.'
  }
  return errors
}

export function serializeGenerationRequest(values: GenerationFormValues): GenerationRequest {
  if (values.activePlatform === null) {
    throw new Error('An active platform is required to serialize a generation request.')
  }

  const subniche = values.subniche.trim()
  const additionalContext = values.additionalContext.trim()

  return {
    topic: values.topic.trim(),
    objective: values.objective.trim(),
    audience: values.audience.trim(),
    tone: values.tone.trim(),
    language: values.language.trim(),
    platform: values.activePlatform,
    niches: values.niches,
    ...(subniche ? { subniche } : {}),
    ...(additionalContext ? { additional_context: additionalContext } : {}),
  }
}

export function normalizeNiche(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function nicheKey(value: string): string {
  return normalizeNiche(value).toLocaleLowerCase('es')
}

export function isNicheSelected(niches: string[], niche: string): boolean {
  return niches.some((selectedNiche) => nicheKey(selectedNiche) === nicheKey(niche))
}

export function addNiche(values: GenerationFormValues, niche: string): GenerationFormValues {
  const normalizedNiche = normalizeNiche(niche)
  if (!normalizedNiche || isNicheSelected(values.niches, normalizedNiche)) {
    return values
  }
  return { ...values, niches: [...values.niches, normalizedNiche] }
}

export function removeNiche(values: GenerationFormValues, niche: string): GenerationFormValues {
  const key = nicheKey(niche)
  return { ...values, niches: values.niches.filter((selectedNiche) => nicheKey(selectedNiche) !== key) }
}

export function toggleNiche(values: GenerationFormValues, niche: string): GenerationFormValues {
  return isNicheSelected(values.niches, niche)
    ? removeNiche(values, niche)
    : addNiche(values, niche)
}

export function toggleSelectedPlatform(values: GenerationFormValues, platform: Platform): GenerationFormValues {
  const isSelected = values.selectedPlatforms.includes(platform)
  const selectedPlatforms = isSelected
    ? values.selectedPlatforms.filter((selectedPlatform) => selectedPlatform !== platform)
    : [...values.selectedPlatforms, platform]
  const activePlatform = isSelected && values.activePlatform === platform
    ? selectedPlatforms[0] ?? null
    : values.activePlatform ?? platform

  return { ...values, selectedPlatforms, activePlatform }
}

export function generationReducer(
  _state: GenerationState,
  action:
    | { type: 'start' }
    | { type: 'success'; result: GenerationResponse }
    | { type: 'error'; error: string }
    | { type: 'reset' },
): GenerationState {
  switch (action.type) {
    case 'start':
      return { status: 'loading', result: null, error: null }
    case 'success':
      return { status: 'success', result: action.result, error: null }
    case 'error':
      return { status: 'error', result: null, error: action.error }
    case 'reset':
      return initialGenerationState
  }
}
