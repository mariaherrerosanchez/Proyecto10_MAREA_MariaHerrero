export type RadarNewsItem = {
  title: string
  source_id: string
  source_name: string
  published_at: string | null
  original_url: string
  fetched_at: string
}

export type RadarSourceStatus = {
  source_id: string
  source_name: string
  status: 'success' | 'error'
  fetched_at: string
  error_code: 'source_unavailable' | 'source_configuration_invalid' | null
}

export type RadarNewsResponse = {
  items: RadarNewsItem[]
  sources: RadarSourceStatus[]
  fetched_at: string
}

export type RadarFilter = 'all' | 'technology' | 'science'

export type RadarInspiration = {
  topic: string
  additionalContext: string
}
