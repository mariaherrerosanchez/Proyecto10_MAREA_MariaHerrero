import { describe, expect, it } from 'vitest'

import type { RadarNewsItem } from '../../radar/types'
import {
  createRadarInspiration,
  filterRadarNews,
  formatRadarPublicationDate,
  isRadarInspiration,
} from './radarNews'

const technologyNews: RadarNewsItem = {
  title: 'Un titular sobre tecnología',
  source_id: 'elpais-tecnologia',
  source_name: 'EL PAÍS · Tecnología',
  published_at: '2026-10-10T08:00:00Z',
  original_url: 'https://elpais.com/tecnologia/example.html',
  fetched_at: '2026-10-10T09:00:00Z',
}

const scienceNews: RadarNewsItem = {
  ...technologyNews,
  title: 'Un titular sobre ciencia',
  source_id: 'elpais-ciencia',
  source_name: 'EL PAÍS · Ciencia',
  published_at: null,
}

describe('Radar news helpers', () => {
  it('filters RSS news by the configured technology and science source identifiers', () => {
    expect(filterRadarNews([technologyNews, scienceNews], 'all')).toEqual([technologyNews, scienceNews])
    expect(filterRadarNews([technologyNews, scienceNews], 'technology')).toEqual([technologyNews])
    expect(filterRadarNews([technologyNews, scienceNews], 'science')).toEqual([scienceNews])
  })

  it('formats available dates and does not invent invalid or absent dates', () => {
    expect(formatRadarPublicationDate('2026-10-10T08:00:00Z')).toContain('2026')
    expect(formatRadarPublicationDate(null)).toBeNull()
    expect(formatRadarPublicationDate('not-a-date')).toBeNull()
  })

  it('creates an editable inspiration context with only RSS metadata', () => {
    const inspiration = createRadarInspiration(technologyNews)

    expect(inspiration.topic).toBe(technologyNews.title)
    expect(inspiration.additionalContext).toContain('No se ha leído el artículo completo')
    expect(inspiration.additionalContext).toContain(technologyNews.source_name)
    expect(inspiration.additionalContext).toContain(technologyNews.original_url)
    expect(isRadarInspiration(inspiration)).toBe(true)
    expect(isRadarInspiration({ topic: technologyNews.title })).toBe(false)
  })
})
