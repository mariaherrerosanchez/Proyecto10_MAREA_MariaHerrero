export type StockImage = {
  identifier: string
  thumbnail_url: string
  display_url: string
  author_name: string
  original_url: string
  provider: 'pexels' | 'demo'
}

export type StockImageSearchResponse = {
  items: StockImage[]
  provider: 'pexels' | 'demo'
}
