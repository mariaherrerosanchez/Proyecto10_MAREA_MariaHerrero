export const platforms = ['linkedin', 'instagram', 'facebook', 'blog'] as const

export type Platform = (typeof platforms)[number]

export type GenerationRequest = {
  topic: string
  objective: string
  audience: string
  tone: string
  language: string
  platform: Platform
  niches: string[]
  subniche?: string
  additional_context?: string
}

export type GenerationTrace = {
  prompt_version: string
  context: Omit<GenerationRequest, 'subniche' | 'additional_context'> & {
    subniche: string | null
    additional_context: string | null
    profile_context: unknown | null
  }
}

export type GenerationResponse = {
  text: string
  provider: string
  model: string
  trace: GenerationTrace
}

export type GenerationFormValues = {
  topic: string
  objective: string
  audience: string
  tone: string
  language: string
  additionalContext: string
  niches: string[]
  subniche: string
  selectedPlatforms: Platform[]
  activePlatform: Platform | null
}
