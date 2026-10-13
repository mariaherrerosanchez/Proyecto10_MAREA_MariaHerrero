import { describe, expect, it } from 'vitest'

import { clearTranslation, markTranslationReviewed, saveTranslation } from './translationState'

const response = {
  text: 'Hello #MAREA',
  target_language: 'en' as const,
  provider: 'groq',
  model: 'configured-model',
  processing_location: 'external' as const,
}

describe('translation session state', () => {
  it('keeps translations independent by platform and unreviewed by default', () => {
    const state = saveTranslation(saveTranslation({}, 'linkedin', response), 'instagram', {
      ...response,
      text: 'Bonjour #MAREA',
      target_language: 'fr',
    })

    expect(state.linkedin).toMatchObject({ text: 'Hello #MAREA', reviewed: false })
    expect(markTranslationReviewed(state, 'linkedin').linkedin?.reviewed).toBe(true)
    expect(clearTranslation(state, 'linkedin')).toEqual({ instagram: state.instagram })
  })
})
