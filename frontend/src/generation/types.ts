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

export type MultichannelGenerationRequest = Omit<GenerationRequest, 'platform'> & {
  platforms: Platform[]
}

export type GenerationTrace = {
  prompt_version: string
  context: Omit<GenerationRequest, 'subniche' | 'additional_context'> & {
    subniche: string | null
    additional_context: string | null
    profile_context: unknown | null
  }
}

export type GuardrailFinding = {
  category: string
  reason: string
}

export type GuardrailAssessment = {
  findings: GuardrailFinding[]
  review_required: boolean
}

export type ProcessingLocation = 'local' | 'external'

export type GenerationResponse = {
  text: string
  provider: string
  model: string
  processing_location: ProcessingLocation
  trace: GenerationTrace
  guardrails: GuardrailAssessment
}

export type SuccessfulPlatformGeneration = {
  status: 'success'
  platform: Platform
  generation: GenerationResponse
}

export type FailedPlatformGeneration = {
  status: 'error'
  platform: Platform
  error: {
    code: string
    detail: string
  }
}

export type MultichannelGenerationResponse = {
  results: Array<SuccessfulPlatformGeneration | FailedPlatformGeneration>
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
