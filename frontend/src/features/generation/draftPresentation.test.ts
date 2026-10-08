import { describe, expect, it } from 'vitest'

import { normalizeDraftText, parseDraftBlocks, processingLocationLabel, reviewMessage } from './draftPresentation'

describe('draft presentation', () => {
  it('normalizes only the observed escaped Markdown and encoded-space artifacts', () => {
    expect(normalizeDraftText('\\*\\*MAREA\\*\\*\n\\# Título\n\\- Punto&#x20;clave')).toBe('**MAREA**\n# Título\n- Punto clave')
  })

  it('preserves ordinary Markdown, HTML-looking text and unmodified content', () => {
    const draft = '**MAREA**\n# Título\n- Punto\n&lt;contenido&gt;'

    expect(normalizeDraftText(draft)).toBe(draft)
    expect(parseDraftBlocks(draft)).toEqual([
      { type: 'paragraph', text: '**MAREA**' },
      { type: 'heading', text: 'Título' },
      { type: 'list', items: ['Punto'] },
      { type: 'paragraph', text: '&lt;contenido&gt;' },
    ])
  })

  it('labels the backend-provided processing location without inferring providers in the frontend', () => {
    expect(processingLocationLabel('local')).toBe('LOCAL')
    expect(processingLocationLabel('external')).toBe('EXTERNO')
    expect(processingLocationLabel(undefined)).toBe('NO DISPONIBLE')
    expect(processingLocationLabel('other')).toBe('NO DISPONIBLE')
  })

  it('shows a special review message only when guardrails require it', () => {
    expect(reviewMessage({ findings: [], review_required: false })).toBeNull()
    expect(reviewMessage({ findings: [{ category: 'experience', reason: 'Unverified claim' }], review_required: true })).toContain('revisión adicional')
  })
})
