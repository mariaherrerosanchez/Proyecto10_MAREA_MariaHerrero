import type { Platform, TranslationLanguage, TranslationResponse } from '../../generation/types'

export type DraftTranslation = {
  language: TranslationLanguage
  model: string
  processingLocation: TranslationResponse['processing_location']
  provider: string
  reviewed: boolean
  text: string
}

export type TranslationState = Partial<Record<Platform, DraftTranslation>>

export function saveTranslation(
  state: TranslationState,
  platform: Platform,
  response: TranslationResponse,
): TranslationState {
  return {
    ...state,
    [platform]: {
      language: response.target_language,
      text: response.text,
      reviewed: false,
      provider: response.provider,
      model: response.model,
      processingLocation: response.processing_location,
    },
  }
}

export function markTranslationReviewed(state: TranslationState, platform: Platform): TranslationState {
  const translation = state[platform]
  return translation === undefined ? state : { ...state, [platform]: { ...translation, reviewed: true } }
}

export function clearTranslation(state: TranslationState, platform: Platform): TranslationState {
  const next = { ...state }
  delete next[platform]
  return next
}
