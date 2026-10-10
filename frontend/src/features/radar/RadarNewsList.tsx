import type { RadarFilter, RadarNewsItem, RadarSourceStatus } from '../../radar/types'
import { formatRadarPublicationDate } from './radarNews'

type RadarNewsListProps = {
  filter: RadarFilter
  items: RadarNewsItem[]
  onFilterChange: (filter: RadarFilter) => void
  onUseInspiration: (item: RadarNewsItem) => void
  sourceStatuses: RadarSourceStatus[]
}

const filterOptions: Array<{ label: string; value: RadarFilter }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Tecnología', value: 'technology' },
  { label: 'Ciencia', value: 'science' },
]

export function RadarNewsList({
  filter,
  items,
  onFilterChange,
  onUseInspiration,
  sourceStatuses,
}: RadarNewsListProps) {
  const unavailableSources = sourceStatuses.filter((source) => source.status === 'error')

  return (
    <>
      <div className="radar-toolbar">
        <div className="radar-filters" aria-label="Filtrar noticias">
          {filterOptions.map((option) => (
            <button
              aria-pressed={filter === option.value}
              className={`radar-filter${filter === option.value ? ' radar-filter--active' : ''}`}
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {unavailableSources.length > 0 ? (
        <p className="radar-source-alert" role="status">
          Algunas fuentes no están disponibles ahora. Mostramos las noticias recuperadas del resto.
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="radar-state" role="status">
          <h2>No hay noticias para este filtro</h2>
          <p>Prueba otra categoría o actualiza las fuentes para consultar nuevas señales de actualidad.</p>
        </div>
      ) : (
        <div className="radar-news-grid">
          {items.map((item) => (
            <article className="radar-news-card" key={`${item.source_id}-${item.original_url}`}>
              <p className="radar-news-card__source">{item.source_name}</p>
              <h2>{item.title}</h2>
              <p className="radar-news-card__date">
                {formatRadarPublicationDate(item.published_at) ?? 'Fecha de publicación no disponible'}
              </p>
              <div className="radar-news-card__actions">
                <a href={item.original_url} rel="noreferrer" target="_blank">
                  Ver artículo original
                </a>
                <button className="button button--primary" onClick={() => onUseInspiration(item)} type="button">
                  Usar como inspiración
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
