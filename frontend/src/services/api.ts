export type HealthResponse = {
  status: string
  service: string
  environment: string
}

type Fetcher = typeof fetch

const defaultApiBaseUrl = 'http://localhost:8000'

export class ApiConnectionError extends Error {
  constructor() {
    super('No se pudo conectar con el servicio.')
    this.name = 'ApiConnectionError'
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
  }
}
