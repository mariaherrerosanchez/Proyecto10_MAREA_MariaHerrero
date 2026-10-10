import type { RadarFilter, RadarInspiration, RadarNewsItem } from '../../radar/types'

const sourceFilters: Record<Exclude<RadarFilter, 'all'>, string> = {
  technology: 'elpais-tecnologia',
  science: 'elpais-ciencia',
}

export function filterRadarNews(items: RadarNewsItem[], filter: RadarFilter): RadarNewsItem[] {
  if (filter === 'all') {
    return items
  }

  return items.filter((item) => item.source_id === sourceFilters[filter])
}

export function formatRadarPublicationDate(publishedAt: string | null): string | null {
  if (publishedAt === null) {
    return null
  }

  const date = new Date(publishedAt)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(date)
}

export function createRadarInspiration(item: RadarNewsItem): RadarInspiration {
  const publishedDate = formatRadarPublicationDate(item.published_at)
  const dateLine = publishedDate ? `Fecha de publicación: ${publishedDate}\n` : ''

  return {
    topic: item.title,
    additionalContext: [
      'Inspiración a partir de una noticia RSS pública. No se ha leído el artículo completo: usa esta referencia solo como señal de actualidad y verifica cualquier dato antes de afirmarlo.',
      `Titular: ${item.title}`,
      `Fuente: ${item.source_name}`,
      `${dateLine}Enlace original: ${item.original_url}`,
    ].join('\n'),
  }
}

export function isRadarInspiration(value: unknown): value is RadarInspiration {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const { topic, additionalContext } = value as Record<string, unknown>
  return typeof topic === 'string' && typeof additionalContext === 'string'
}
