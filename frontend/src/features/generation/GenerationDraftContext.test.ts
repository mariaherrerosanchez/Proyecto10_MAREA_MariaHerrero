import { describe, expect, it } from 'vitest'

import type { GenerationFormValues } from '../../generation/types'
import { createDraftSnapshot, emptyGenerationDraft, sameDraft } from './GenerationDraftContext'

describe('generation draft session context', () => {
  it('keeps an independent snapshot of the complete Crear draft', () => {
    const source: GenerationFormValues = {
      ...emptyGenerationDraft,
      topic: 'Explicar IA aplicada',
      objective: 'Divulgación',
      audience: 'Profesionales no técnicos',
      tone: 'Cercano y profesional',
      language: 'en',
      modelSelection: 'secondary' as const,
      additionalContext: 'Evita tecnicismos innecesarios.',
      niches: ['Tecnología', 'Educación'],
      subniche: 'Aprendizaje con IA',
      selectedPlatforms: ['linkedin', 'blog'],
      activePlatform: 'blog',
    }

    const snapshot = createDraftSnapshot(source)
    source.niches.push('Cambio local')
    source.selectedPlatforms.pop()

    expect(snapshot).toMatchObject({
      topic: 'Explicar IA aplicada',
      objective: 'Divulgación',
      audience: 'Profesionales no técnicos',
      tone: 'Cercano y profesional',
      language: 'en',
      modelSelection: 'secondary',
      additionalContext: 'Evita tecnicismos innecesarios.',
      niches: ['Tecnología', 'Educación'],
      subniche: 'Aprendizaje con IA',
      selectedPlatforms: ['linkedin', 'blog'],
      activePlatform: 'blog',
    })
  })

  it('identifies an unchanged draft to avoid an unnecessary context update', () => {
    expect(sameDraft(emptyGenerationDraft, createDraftSnapshot(emptyGenerationDraft))).toBe(true)
    expect(sameDraft(emptyGenerationDraft, {
      ...emptyGenerationDraft,
      topic: 'Nuevo tema',
    })).toBe(false)
  })
})
