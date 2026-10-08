import { describe, expect, it } from 'vitest'

import type { MultichannelGenerationResponse } from '../../generation/types'
import {
  beginDraftEdit,
  createDraftReviewState,
  hasEditedDrafts,
  markDraftReviewed,
  updateDraftText,
} from './draftReviewState'

const result: MultichannelGenerationResponse = {
  results: [
    {
      status: 'success',
      platform: 'linkedin',
      generation: {
        text: 'Borrador de LinkedIn.', provider: 'fake', model: 'fake-model', processing_location: 'external',
        trace: { prompt_version: 'v7', context: { topic: 'Tema', objective: 'Informar', audience: 'Audiencia', tone: 'Claro', language: 'es', platform: 'linkedin', niches: [], subniche: null, additional_context: null, profile_context: null } },
        guardrails: { findings: [], review_required: false },
      },
    },
    {
      status: 'success',
      platform: 'instagram',
      generation: {
        text: 'Borrador de Instagram.', provider: 'fake', model: 'fake-model', processing_location: 'external',
        trace: { prompt_version: 'v7', context: { topic: 'Tema', objective: 'Informar', audience: 'Audiencia', tone: 'Claro', language: 'es', platform: 'instagram', niches: [], subniche: null, additional_context: null, profile_context: null } },
        guardrails: { findings: [], review_required: false },
      },
    },
    { status: 'error', platform: 'blog', error: { code: 'provider_request_failed', detail: 'Error seguro.' } },
  ],
}

describe('draft review state', () => {
  it('creates independent pending drafts only for successful platforms', () => {
    const drafts = createDraftReviewState(result)

    expect(drafts.linkedin).toMatchObject({ text: 'Borrador de LinkedIn.', reviewed: false })
    expect(drafts.instagram).toMatchObject({ text: 'Borrador de Instagram.', reviewed: false })
    expect(drafts.blog).toBeUndefined()
  })

  it('keeps other platform drafts unchanged when one is edited', () => {
    const drafts = updateDraftText(createDraftReviewState(result), 'linkedin', 'Versión revisada para LinkedIn.')

    expect(drafts.linkedin).toMatchObject({ text: 'Versión revisada para LinkedIn.', reviewed: false })
    expect(drafts.instagram).toMatchObject({ text: 'Borrador de Instagram.', reviewed: false })
    expect(hasEditedDrafts(drafts)).toBe(true)
  })

  it('returns a reviewed draft to pending when editing begins', () => {
    const reviewed = markDraftReviewed(createDraftReviewState(result), 'linkedin')
    const editing = beginDraftEdit(reviewed, 'linkedin')

    expect(reviewed.linkedin?.reviewed).toBe(true)
    expect(editing.linkedin?.reviewed).toBe(false)
  })

  it('tracks review confirmation per platform', () => {
    const reviewed = markDraftReviewed(createDraftReviewState(result), 'linkedin')

    expect(reviewed.linkedin?.reviewed).toBe(true)
    expect(reviewed.instagram?.reviewed).toBe(false)
  })
})
