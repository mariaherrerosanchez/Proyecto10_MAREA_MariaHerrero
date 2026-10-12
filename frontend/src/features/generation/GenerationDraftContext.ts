import { createContext, useContext } from 'react'

import type { GenerationFormValues } from '../../generation/types'
import { initialFormValues } from './formState'

export function createDraftSnapshot(draft: GenerationFormValues): GenerationFormValues {
  return {
    ...draft,
    niches: [...draft.niches],
    selectedPlatforms: [...draft.selectedPlatforms],
  }
}

export type GenerationDraftContextValue = {
  draft: GenerationFormValues
  setDraft: (draft: GenerationFormValues) => void
}

export const GenerationDraftContext = createContext<GenerationDraftContextValue | null>(null)

export const emptyGenerationDraft = createDraftSnapshot(initialFormValues)

export function sameDraft(left: GenerationFormValues, right: GenerationFormValues): boolean {
  return left.topic === right.topic
    && left.objective === right.objective
    && left.audience === right.audience
    && left.tone === right.tone
    && left.language === right.language
    && left.modelSelection === right.modelSelection
    && left.additionalContext === right.additionalContext
    && left.subniche === right.subniche
    && left.activePlatform === right.activePlatform
    && sameValues(left.niches, right.niches)
    && sameValues(left.selectedPlatforms, right.selectedPlatforms)
}

function sameValues<T>(left: T[], right: T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export function useGenerationDraft(): GenerationDraftContextValue {
  const context = useContext(GenerationDraftContext)
  if (context === null) {
    throw new Error('useGenerationDraft must be used within GenerationDraftProvider.')
  }
  return context
}
