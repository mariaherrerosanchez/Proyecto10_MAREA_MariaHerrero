import type { MultichannelGenerationResponse, Platform } from '../../generation/types'

export type ReviewedDraft = {
  originalText: string
  text: string
  reviewed: boolean
}

export type DraftReviewState = Partial<Record<Platform, ReviewedDraft>>

export function createDraftReviewState(result: MultichannelGenerationResponse): DraftReviewState {
  return result.results.reduce<DraftReviewState>((drafts, item) => {
    if (item.status === 'success') {
      drafts[item.platform] = {
        originalText: item.generation.text,
        text: item.generation.text,
        reviewed: false,
      }
    }
    return drafts
  }, {})
}

export function beginDraftEdit(state: DraftReviewState, platform: Platform): DraftReviewState {
  const draft = state[platform]
  return draft === undefined ? state : { ...state, [platform]: { ...draft, reviewed: false } }
}

export function updateDraftText(
  state: DraftReviewState,
  platform: Platform,
  text: string,
): DraftReviewState {
  const draft = state[platform]
  return draft === undefined ? state : { ...state, [platform]: { ...draft, text, reviewed: false } }
}

export function markDraftReviewed(state: DraftReviewState, platform: Platform): DraftReviewState {
  const draft = state[platform]
  return draft === undefined ? state : { ...state, [platform]: { ...draft, reviewed: true } }
}

export function hasEditedDrafts(state: DraftReviewState): boolean {
  return Object.values(state).some((draft) => draft?.text !== draft?.originalText)
}

export function hasEditedDraft(state: DraftReviewState, platform: Platform): boolean {
  const draft = state[platform]
  return draft !== undefined && draft.text !== draft.originalText
}

export function replaceDraft(state: DraftReviewState, platform: Platform, text: string): DraftReviewState {
  return {
    ...state,
    [platform]: { originalText: text, text, reviewed: false },
  }
}
