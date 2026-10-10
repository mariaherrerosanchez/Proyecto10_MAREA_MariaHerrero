import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RadarNewsList } from './RadarNewsList'

describe('RadarNewsList', () => {
  it('renders source metadata, an original link, an inspiration action and partial-source feedback', () => {
    const markup = renderToStaticMarkup(
      <RadarNewsList
        filter="all"
        items={[{
          title: 'La ciencia y la IA',
          source_id: 'elpais-ciencia',
          source_name: 'EL PAÍS · Ciencia',
          published_at: '2026-10-10T08:00:00Z',
          original_url: 'https://elpais.com/ciencia/example.html',
          fetched_at: '2026-10-10T09:00:00Z',
        }]}
        onFilterChange={() => undefined}
        onUseInspiration={() => undefined}
        sourceStatuses={[
          { source_id: 'elpais-ciencia', source_name: 'EL PAÍS · Ciencia', status: 'success', fetched_at: '2026-10-10T09:00:00Z', error_code: null },
          { source_id: 'elpais-tecnologia', source_name: 'EL PAÍS · Tecnología', status: 'error', fetched_at: '2026-10-10T09:00:00Z', error_code: 'source_unavailable' },
        ]}
      />,
    )

    expect(markup).toContain('La ciencia y la IA')
    expect(markup).toContain('EL PAÍS · Ciencia')
    expect(markup).toContain('Ver artículo original')
    expect(markup).toContain('Usar como inspiración')
    expect(markup).toContain('Algunas fuentes no están disponibles ahora')
    expect(markup).toContain('aria-pressed="true"')
  })

  it('renders a clear empty state for a filter without results', () => {
    const markup = renderToStaticMarkup(
      <RadarNewsList
        filter="science"
        items={[]}
        onFilterChange={() => undefined}
        onUseInspiration={() => undefined}
        sourceStatuses={[]}
      />,
    )

    expect(markup).toContain('No hay noticias para este filtro')
  })
})
