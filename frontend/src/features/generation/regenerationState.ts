import type {
  GenerationRequest,
  GenerationResponse,
  MultichannelGenerationRequest,
  MultichannelGenerationResponse,
  Platform,
} from '../../generation/types'

export type PlatformRegeneration = {
  error: string | null
  status: 'loading' | 'error'
}

export type PlatformRegenerationState = Partial<Record<Platform, PlatformRegeneration>>

export function createRegenerationRequest(
  request: MultichannelGenerationRequest,
  platform: Platform,
): GenerationRequest {
  return {
    topic: request.topic,
    objective: request.objective,
    audience: request.audience,
    tone: request.tone,
    language: request.language,
    model_selection: request.model_selection,
    niches: request.niches,
    ...(request.subniche === undefined ? {} : { subniche: request.subniche }),
    ...(request.additional_context === undefined ? {} : { additional_context: request.additional_context }),
    platform,
  }
}

export function startPlatformRegeneration(
  state: PlatformRegenerationState,
  platform: Platform,
): PlatformRegenerationState {
  return { ...state, [platform]: { status: 'loading', error: null } }
}

export function failPlatformRegeneration(
  state: PlatformRegenerationState,
  platform: Platform,
  error: string,
): PlatformRegenerationState {
  return { ...state, [platform]: { status: 'error', error } }
}

export function completePlatformRegeneration(
  state: PlatformRegenerationState,
  platform: Platform,
): PlatformRegenerationState {
  const nextState = { ...state }
  delete nextState[platform]
  return nextState
}

export function hasRegenerationInProgress(state: PlatformRegenerationState): boolean {
  return Object.values(state).some((regeneration) => regeneration?.status === 'loading')
}

export function replacePlatformGeneration(
  result: MultichannelGenerationResponse,
  platform: Platform,
  generation: GenerationResponse,
): MultichannelGenerationResponse {
  return {
    ...result,
    results: result.results.map((item) => item.platform === platform
      ? { status: 'success' as const, platform, generation }
      : item),
  }
}
