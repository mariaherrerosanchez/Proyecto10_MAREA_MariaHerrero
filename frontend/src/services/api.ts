import type {
  AvailableGenerationModel,
  GenerationRequest,
  GenerationResponse,
  MultichannelGenerationRequest,
  MultichannelGenerationResponse,
} from '../generation/types'
import type { RadarNewsResponse } from '../radar/types'

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
    && (source.status === 'success' || source.status === 'error')
    && typeof source.fetched_at === 'string'
    && (source.error_code === null
      || source.error_code === 'source_unavailable'
      || source.error_code === 'source_configuration_invalid')
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
    async getRadarNews(fetcher: Fetcher = fetch): Promise<RadarNewsResponse> {
      let response: Response

      try {
        response = await fetcher(`${baseUrl}/radar/news`)
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
