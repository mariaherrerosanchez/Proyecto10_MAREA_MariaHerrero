import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useGenerationDraft } from '../features/generation/GenerationDraftContext'
import { RadarNewsList } from '../features/radar/RadarNewsList'
import { createRadarInspiration, filterRadarNews, selectRadarSearchTopics } from '../features/radar/radarNews'
import type { RadarFilter, RadarNewsResponse } from '../radar/types'
import { createApiClient } from '../services/api'

export function RadarPage() {
  const [news, setNews] = useState<RadarNewsResponse | null>(null)
  const [filter, setFilter] = useState<RadarFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSearchTopics, setActiveSearchTopics] = useState<string[]>([])
  const navigate = useNavigate()
  const { draft } = useGenerationDraft()

  const loadNews = useCallback(async (topics: string[] = []) => {
    setIsLoading(true)
    setError(null)

    try {
      setNews(await createApiClient().getRadarNews(topics))
      setActiveSearchTopics(topics)
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

  function searchByInterests() {
    setFilter('all')
    void loadNews(searchTopics)
  }

  const filteredItems = news === null ? [] : filterRadarNews(news.items, filter)
  const searchTopics = selectRadarSearchTopics(draft.niches, draft.subniche)

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
          {isLoading ? 'Actualizando…' : 'Ver fuentes generales'}
        </button>
      </header>

      {draft.niches.length > 0 || draft.subniche ? (
        <aside className="radar-interests" aria-label="Intereses actuales">
          <p className="eyebrow">Tus intereses actuales</p>
          <p>
            {[...draft.niches, draft.subniche].filter(Boolean).join(' · ')}
          </p>
          <div className="radar-interests__actions">
            <Link className="button button--secondary" to="/crear">
              <PencilIcon />
              Editar mis intereses
            </Link>
            <button
              className="button button--primary"
              disabled={isLoading || searchTopics.length === 0}
              onClick={searchByInterests}
              type="button"
            >
              Buscar noticias de mis intereses
            </button>
          </div>
          <p className="radar-interests__disclosure">
            Al buscar, enviaremos a Google News: {searchTopics.join(' · ')}.
          </p>
        </aside>
      ) : (
        <aside className="radar-interests" aria-label="Intereses actuales">
          <p className="eyebrow">Personaliza tu Radar</p>
          <p>Añade nichos o un subnicho en Crear para buscar noticias relacionadas con tus intereses.</p>
          <Link className="button button--secondary" to="/crear">
            <PencilIcon />
            Editar mis intereses
          </Link>
        </aside>
      )}

      {activeSearchTopics.length > 0 ? (
        <p className="radar-search-summary" role="status">
          Mostrando resultados para: {activeSearchTopics.join(' · ')}.
        </p>
      ) : null}

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
          showFilters={activeSearchTopics.length === 0}
          sourceStatuses={news.sources}
        />
      ) : null}
    </div>
  )
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="m13.8 6.7 3.5 3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  )
}
