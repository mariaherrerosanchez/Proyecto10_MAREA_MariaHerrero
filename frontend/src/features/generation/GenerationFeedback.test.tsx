import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { GenerationFeedback } from './GenerationFeedback'

describe('GenerationFeedback', () => {
  it('keeps the draft and the general review notice visible when guardrails are absent', () => {
    const markup = renderToStaticMarkup(
      <GenerationFeedback
        generation={{
          status: 'success',
          error: null,
          result: {
            text: 'Borrador que sigue disponible.',
            provider: 'proveedor',
            model: 'modelo',
            processing_location: undefined,
            trace: {
              prompt_version: 'v5',
              context: {
                topic: 'Tema',
                objective: 'Informar',
                audience: 'Audiencia',
                tone: 'Claro',
                language: 'es',
                platform: 'blog',
                niches: [],
                subniche: null,
                additional_context: null,
                profile_context: null,
              },
            },
          },
        }}
      />,
    )

    expect(markup).toContain('Borrador que sigue disponible.')
    expect(markup).toContain('la decisión editorial siempre es tuya')
    expect(markup).toContain('NO DISPONIBLE')
    expect(markup).not.toContain('han señalado posibles afirmaciones')
  })
})
