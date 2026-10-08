import type { GenerationRequest, GenerationResponse, MultichannelGenerationRequest, MultichannelGenerationResponse } from '../generation/types'

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

function isSafeMultichannelError(value: unknown): value is SafeMultichannelError {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const { code, detail } = value as { code?: unknown; detail?: unknown }
  return typeof detail === 'string' && multichannelErrorCodes.some((knownCode) => knownCode === code)
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
