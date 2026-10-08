import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { GenerationFeedback } from './GenerationFeedback'
import { initialResultPlatform } from './resultTabs'

describe('GenerationFeedback', () => {
  it('keeps the draft and the general review notice visible when guardrails are absent', () => {
    const markup = renderToStaticMarkup(
      <GenerationFeedback
        generation={{
          status: 'success',
          error: null,
          result: {
            results: [
              {
                status: 'success',
                platform: 'blog',
                generation: {
                  text: 'Borrador que sigue disponible.',
                  provider: 'proveedor',
                  model: 'modelo',
                  processing_location: undefined,
                  trace: {
                    prompt_version: 'v7',
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
              },
              {
                status: 'error',
                platform: 'linkedin',
                error: { code: 'provider_request_failed', detail: 'Error seguro.' },
              },
            ],
          },
        }}
        initialPlatform="blog"
      />,
    )

    expect(markup).toContain('Borrador que sigue disponible.')
    expect(markup).toContain('la decisión editorial siempre es tuya')
    expect(markup).toContain('NO DISPONIBLE')
    expect(markup).not.toContain('han señalado posibles afirmaciones')
    expect(markup).toContain('role="tablist"')
    expect(markup).toContain('Blog')
    expect(markup).toContain('LinkedIn')
  })

  it('uses the active platform when available and falls back to the first result', () => {
    const result = {
      results: [
        { status: 'error' as const, platform: 'instagram' as const, error: { code: 'error', detail: 'Error.' } },
        { status: 'error' as const, platform: 'blog' as const, error: { code: 'error', detail: 'Error.' } },
      ],
    }

    expect(initialResultPlatform(result, 'blog')).toBe('blog')
    expect(initialResultPlatform(result, 'linkedin')).toBe('instagram')
  })
})
