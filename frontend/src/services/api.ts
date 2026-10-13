import type {
  AvailableGenerationModel,
  GenerationRequest,
  GenerationResponse,
  MultichannelGenerationRequest,
  MultichannelGenerationResponse,
  TranslationRequest,
  TranslationResponse,
} from '../generation/types'
import type { RadarNewsResponse } from '../radar/types'
import type { StockImageSearchResponse } from '../images/types'

export type HealthResponse = {
  status: string
  service: string
  environment: string
}

type Fetcher = typeof fetch

const defaultApiBaseUrl = 'http://localhost:8000'
const multichannelErrorCodes = [
  'provider_request_failed',
  'provider_not_available',
  'provider_not_configured',
  'generation_unavailable',
] as const

type MultichannelErrorCode = (typeof multichannelErrorCodes)[number]

type SafeMultichannelError = {
  code: MultichannelErrorCode
  detail: string
}

const modelSelections = ['primary', 'secondary', 'tertiary'] as const

function isAvailableGenerationModel(value: unknown): value is AvailableGenerationModel {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const { selection, provider, model, processing_location: processingLocation } = value as {
    selection?: unknown
    provider?: unknown
    model?: unknown
    processing_location?: unknown
  }

  return modelSelections.some((knownSelection) => knownSelection === selection)
    && typeof provider === 'string'
    && provider.length > 0
    && typeof model === 'string'
    && model.length > 0
    && (processingLocation === 'local' || processingLocation === 'external')
}

export class ApiConnectionError extends Error {
  constructor() {
    super('No se pudo conectar con el servicio.')
    this.name = 'ApiConnectionError'
  }
}

export class GenerationRequestError extends Error {
  constructor(message = 'No se ha podido generar el borrador. Inténtalo de nuevo.') {
    super(message)
    this.name = 'GenerationRequestError'
  }
}

export class RadarRequestError extends Error {
  constructor() {
    super('No se han podido cargar las noticias ahora. Inténtalo de nuevo.')
    this.name = 'RadarRequestError'
  }
}

export class ImageSearchRequestError extends Error {
  constructor(message = 'No se han podido buscar imágenes ahora. Inténtalo de nuevo.') {
    super(message)
    this.name = 'ImageSearchRequestError'
  }
}

export class TranslationRequestError extends Error {
  constructor() {
    super('No se ha podido traducir el borrador. Inténtalo de nuevo.')
    this.name = 'TranslationRequestError'
  }
}

function isSafeMultichannelError(value: unknown): value is SafeMultichannelError {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const { code, detail } = value as { code?: unknown; detail?: unknown }
  return typeof detail === 'string' && multichannelErrorCodes.some((knownCode) => knownCode === code)
}

function isRadarNewsResponse(value: unknown): value is RadarNewsResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const { items, sources, fetched_at: fetchedAt } = value as Record<string, unknown>
  return Array.isArray(items)
    && Array.isArray(sources)
    && typeof fetchedAt === 'string'
    && items.every((item) => isRadarNewsItem(item))
    && sources.every((source) => isRadarSourceStatus(source))
}

function isRadarNewsItem(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const item = value as Record<string, unknown>
  return typeof item.title === 'string'
    && typeof item.source_id === 'string'
    && typeof item.source_name === 'string'
    && (item.source_kind === 'verified_feed' || item.source_kind === 'search_aggregator')
    && (typeof item.published_at === 'string' || item.published_at === null)
    && isHttpUrl(item.original_url)
    && typeof item.fetched_at === 'string'
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function isRadarSourceStatus(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const source = value as Record<string, unknown>
  return typeof source.source_id === 'string'
    && typeof source.source_name === 'string'
    && (source.source_kind === 'verified_feed' || source.source_kind === 'search_aggregator')
    && (source.status === 'success' || source.status === 'error')
    && typeof source.fetched_at === 'string'
    && (source.error_code === null
      || source.error_code === 'source_unavailable'
      || source.error_code === 'source_configuration_invalid')
}

function isStockImageSearchResponse(value: unknown): value is StockImageSearchResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const { items, provider } = value as Record<string, unknown>
  return (provider === 'pexels' || provider === 'demo')
    && Array.isArray(items)
    && items.every((item) => isStockImage(item))
}

function isTranslationResponse(value: unknown): value is TranslationResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const response = value as Record<string, unknown>
  return typeof response.text === 'string'
    && (response.target_language === 'en' || response.target_language === 'fr' || response.target_language === 'it')
    && typeof response.provider === 'string'
    && typeof response.model === 'string'
    && (response.processing_location === 'local' || response.processing_location === 'external')
}

function isStockImage(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const image = value as Record<string, unknown>
  return typeof image.identifier === 'string'
    && typeof image.thumbnail_url === 'string'
    && typeof image.display_url === 'string'
    && typeof image.author_name === 'string'
    && typeof image.original_url === 'string'
    && (image.provider === 'pexels' || image.provider === 'demo')
    && isHttpUrl(image.thumbnail_url)
    && isHttpUrl(image.display_url)
    && isHttpUrl(image.original_url)
}

async function readSafeMultichannelError(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json()
    return isSafeMultichannelError(body) ? body.detail : undefined
  } catch {
    return undefined
  }
}

export function createApiClient(apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl) {
  const baseUrl = apiBaseUrl.replace(/\/$/, '')

  return {
    async getHealth(fetcher: Fetcher = fetch): Promise<HealthResponse> {
      let response: Response

      try {
        response = await fetcher(`${baseUrl}/health`)
      } catch {
        throw new ApiConnectionError()
      }

      if (!response.ok) {
        throw new ApiConnectionError()
      }

      return (await response.json()) as HealthResponse
    },
    async generateContent(request: GenerationRequest, fetcher: Fetcher = fetch): Promise<GenerationResponse> {
      let response: Response

      try {
        response = await fetcher(`${baseUrl}/generation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        })
      } catch {
        throw new GenerationRequestError('No se ha podido conectar con el servicio. Inténtalo de nuevo.')
      }

      if (!response.ok) {
        throw new GenerationRequestError()
      }

      return (await response.json()) as GenerationResponse
    },
    async getGenerationModels(fetcher: Fetcher = fetch): Promise<AvailableGenerationModel[]> {
      let response: Response

      try {
        response = await fetcher(`${baseUrl}/generation/models`)
      } catch {
        throw new ApiConnectionError()
      }

      if (!response.ok) {
        throw new ApiConnectionError()
      }

      const body: unknown = await response.json()
      if (!Array.isArray(body) || !body.every(isAvailableGenerationModel)) {
        throw new ApiConnectionError()
      }

      return body
    },
    async getRadarNews(topics: string[] = [], fetcher: Fetcher = fetch): Promise<RadarNewsResponse> {
      let response: Response
      const query = new URLSearchParams()
      topics.forEach((topic) => query.append('topics', topic))
      const requestUrl = `${baseUrl}/radar/news${query.size > 0 ? `?${query}` : ''}`

      try {
        response = await fetcher(requestUrl)
      } catch {
        throw new RadarRequestError()
      }

      if (!response.ok) {
        throw new RadarRequestError()
      }

      let body: unknown
      try {
        body = await response.json()
      } catch {
        throw new RadarRequestError()
      }
      if (!isRadarNewsResponse(body)) {
        throw new RadarRequestError()
      }

      return body
    },
    async searchStockImages(query: string, fetcher: Fetcher = fetch): Promise<StockImageSearchResponse> {
      let response: Response
      const search = query.trim()
      if (!search) {
        throw new ImageSearchRequestError('Introduce una consulta para buscar imágenes.')
      }

      try {
        response = await fetcher(`${baseUrl}/images/search?${new URLSearchParams({ query: search })}`)
      } catch {
        throw new ImageSearchRequestError()
      }

      if (!response.ok) {
        throw new ImageSearchRequestError()
      }

      let body: unknown
      try {
        body = await response.json()
      } catch {
        throw new ImageSearchRequestError()
      }
      if (!isStockImageSearchResponse(body)) {
        throw new ImageSearchRequestError()
      }
      return body
    },
    async translateContent(request: TranslationRequest, fetcher: Fetcher = fetch): Promise<TranslationResponse> {
      let response: Response
      try {
        response = await fetcher(`${baseUrl}/translation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        })
      } catch {
        throw new TranslationRequestError()
      }

      if (!response.ok) {
        throw new TranslationRequestError()
      }

      try {
        const body: unknown = await response.json()
        if (!isTranslationResponse(body)) {
          throw new TranslationRequestError()
        }
        return body
      } catch (error) {
        if (error instanceof TranslationRequestError) {
          throw error
        }
        throw new TranslationRequestError()
      }
    },
    async generateMultichannelContent(
      request: MultichannelGenerationRequest,
      fetcher: Fetcher = fetch,
    ): Promise<MultichannelGenerationResponse> {
      let response: Response

      try {
        response = await fetcher(`${baseUrl}/generation/multichannel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        })
      } catch {
        throw new GenerationRequestError('No se pudo conectar con el servicio. Inténtalo de nuevo.')
      }

      if (!response.ok) {
        throw new GenerationRequestError(await readSafeMultichannelError(response))
      }

      return (await response.json()) as MultichannelGenerationResponse
    },
  }
}
