import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { RadarNewsList } from '../features/radar/RadarNewsList'
import { createRadarInspiration, filterRadarNews } from '../features/radar/radarNews'
import type { RadarFilter, RadarNewsResponse } from '../radar/types'
import { createApiClient } from '../services/api'

export function RadarPage() {
  const [news, setNews] = useState<RadarNewsResponse | null>(null)
  const [filter, setFilter] = useState<RadarFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const loadNews = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setNews(await createApiClient().getRadarNews())
    } catch {
      setError('No se han podido actualizar las noticias ahora. Inténtalo de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadNews()
  }, [loadNews])

  function useAsInspiration(item: RadarNewsResponse['items'][number]) {
    navigate('/crear', { state: { radarInspiration: createRadarInspiration(item) } })
  }

  const filteredItems = news === null ? [] : filterRadarNews(news.items, filter)

  return (
    <div className="page radar-page">
      <header className="radar-page__intro">
        <div>
          <p className="eyebrow">Radar</p>
          <h1>Señales para <em>mirar más lejos.</em></h1>
          <p>
            Noticias públicas recientes para inspirar ideas originales. No son tendencias verificadas ni contenido de redes sociales.
          </p>
        </div>
        <button className="section-action" disabled={isLoading} onClick={() => void loadNews()} type="button">
          {isLoading ? 'Actualizando…' : 'Actualizar noticias'}
        </button>
      </header>

      {isLoading && news === null ? (
        <div className="radar-state" aria-live="polite" role="status">
          <h2>Consultando fuentes RSS…</h2>
          <p>Recuperamos titulares y enlaces originales de las fuentes configuradas.</p>
        </div>
      ) : null}

      {error !== null && news === null ? (
        <div className="radar-state radar-state--error" role="alert">
          <h2>No hemos podido cargar el Radar</h2>
          <p>{error}</p>
          <button className="button button--primary" onClick={() => void loadNews()} type="button">Reintentar</button>
        </div>
      ) : null}

      {error !== null && news !== null ? (
        <p className="radar-source-alert" role="alert">
          {error} Mantenemos visibles las noticias recuperadas anteriormente.
        </p>
      ) : null}

      {news !== null ? (
        <RadarNewsList
          filter={filter}
          items={filteredItems}
          onFilterChange={setFilter}
          onUseInspiration={useAsInspiration}
          sourceStatuses={news.sources}
        />
      ) : null}
    </div>
  )
}
