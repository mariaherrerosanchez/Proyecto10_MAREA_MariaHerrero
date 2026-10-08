import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import type {
  FailedPlatformGeneration,
  GuardrailAssessment,
  Platform,
  SuccessfulPlatformGeneration,
} from '../../generation/types'
import type { GenerationState } from './formState'
import type { DraftReviewState, ReviewedDraft } from './draftReviewState'
import { platformLabels } from './constants'
import { DraftContent } from './DraftContent'
import { processingLocationLabel, reviewMessage } from './draftPresentation'
import { initialResultPlatform } from './resultTabs'

type DraftPresentationResponse = Omit<SuccessfulPlatformGeneration['generation'], 'guardrails' | 'processing_location'> & {
  guardrails?: GuardrailAssessment | null
  processing_location?: unknown
}

type DraftPlatformGeneration = Omit<SuccessfulPlatformGeneration, 'generation'> & {
  generation: DraftPresentationResponse
}

type DraftMultichannelGenerationResponse = {
  results: Array<DraftPlatformGeneration | FailedPlatformGeneration>
}

type GenerationFeedbackProps = {
  draftReviews: DraftReviewState
  generation: Omit<GenerationState, 'result'> & {
    result: DraftMultichannelGenerationResponse | null
  }
  initialPlatform: Platform | null
  onBeginEdit: (platform: Platform) => void
  onConfirmReview: (platform: Platform) => void
  onDraftChange: (platform: Platform, text: string) => void
}

export function GenerationFeedback({
  draftReviews,
  generation,
  initialPlatform,
  onBeginEdit,
  onConfirmReview,
  onDraftChange,
}: GenerationFeedbackProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(initialPlatform)
  const tabRefs = useRef<Partial<Record<Platform, HTMLButtonElement>>>({})

  useEffect(() => {
    if (generation.result !== null) {
      setSelectedPlatform(initialResultPlatform(generation.result, initialPlatform))
    }
  }, [generation.result, initialPlatform])

  if (generation.status === 'idle') {
    return null
  }

  if (generation.status === 'loading') {
    return <p className="generation-feedback generation-feedback--loading" aria-live="polite">MAREA está preparando tus borradores…</p>
  }

  if (generation.status === 'error') {
    return <p className="generation-feedback generation-feedback--error" role="alert">{generation.error}</p>
  }

  if (generation.result === null) {
    return null
  }

  const activePlatform = selectedPlatform && generation.result.results.some((item) => item.platform === selectedPlatform)
    ? selectedPlatform
    : initialResultPlatform(generation.result, initialPlatform)
  const activeResult = generation.result.results.find((item) => item.platform === activePlatform)

  if (activeResult === undefined) {
    return null
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const platforms = generation.result?.results.map((item) => item.platform) ?? []
    const currentIndex = platforms.indexOf(activePlatform)
    const nextIndex = event.key === 'ArrowRight'
      ? (currentIndex + 1) % platforms.length
      : event.key === 'ArrowLeft'
        ? (currentIndex - 1 + platforms.length) % platforms.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? platforms.length - 1
            : null

    if (nextIndex !== null) {
      event.preventDefault()
      const nextPlatform = platforms[nextIndex]
      setSelectedPlatform(nextPlatform)
      tabRefs.current[nextPlatform]?.focus()
    }
  }

  return (
    <section className="generation-results" aria-label="Borradores generados">
      <div aria-label="Plataformas generadas" className="generation-results__tabs" role="tablist">
        {generation.result.results.map((result) => {
          const isActive = result.platform === activePlatform
          const tabId = `generation-tab-${result.platform}`
          return (
            <button
              aria-controls={`generation-panel-${result.platform}`}
              aria-selected={isActive}
              className={`generation-results__tab${isActive ? ' generation-results__tab--active' : ''}`}
              id={tabId}
              key={result.platform}
              onClick={() => setSelectedPlatform(result.platform)}
              onKeyDown={onTabKeyDown}
              ref={(element) => { tabRefs.current[result.platform] = element ?? undefined }}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              {platformLabels[result.platform]}
            </button>
          )
        })}
      </div>
      <div aria-labelledby={`generation-tab-${activePlatform}`} id={`generation-panel-${activePlatform}`} role="tabpanel" tabIndex={0}>
        {activeResult.status === 'success'
          ? <GeneratedDraft
              draft={draftReviews[activeResult.platform] ?? createPendingDraft(activeResult.generation.text)}
              generation={activeResult.generation}
              key={activeResult.platform}
              onBeginEdit={onBeginEdit}
              onConfirmReview={onConfirmReview}
              onDraftChange={onDraftChange}
              platform={activeResult.platform}
            />
          : <GenerationFailure error={activeResult} />}
      </div>
    </section>
  )
}

function createPendingDraft(text: string): ReviewedDraft {
  return { originalText: text, text, reviewed: false }
}

type GeneratedDraftProps = {
  draft: ReviewedDraft
  generation: DraftPresentationResponse
  onBeginEdit: (platform: Platform) => void
  onConfirmReview: (platform: Platform) => void
  onDraftChange: (platform: Platform, text: string) => void
  platform: Platform
}

function GeneratedDraft({
  draft,
  generation,
  onBeginEdit,
  onConfirmReview,
  onDraftChange,
  platform,
}: GeneratedDraftProps) {
  const [isEditing, setIsEditing] = useState(false)
  const guardrailReviewMessage = reviewMessage(generation.guardrails)
  return (
    <section className="generation-draft" aria-live="polite" aria-labelledby="draft-heading">
      <p className="eyebrow">Borrador para {platformLabels[platform]}</p>
      <h2 id="draft-heading">Revísalo antes de utilizarlo</h2>
      <p className="generation-draft__notice">Es una propuesta inicial: la decisión editorial siempre es tuya.</p>
      {guardrailReviewMessage ? <p className="generation-draft__review-alert" role="status">{guardrailReviewMessage}</p> : null}
      {isEditing ? (
        <label className="form-field generation-draft__editor" htmlFor={`draft-editor-${platform}`}>
          <span>Texto del borrador</span>
          <textarea
            id={`draft-editor-${platform}`}
            onChange={(event) => onDraftChange(platform, event.target.value)}
            rows={12}
            value={draft.text}
          />
        </label>
      ) : <DraftContent text={draft.text} />}
      <div className="generation-draft__actions">
        {isEditing ? (
          <button className="generation-draft__action" onClick={() => setIsEditing(false)} type="button">
            Terminar edición
          </button>
        ) : (
          <button
            className="generation-draft__action"
            onClick={() => {
              onBeginEdit(platform)
              setIsEditing(true)
            }}
            type="button"
          >
            Editar borrador
          </button>
        )}
        <button
          className="generation-draft__action generation-draft__action--review"
          disabled={draft.reviewed}
          onClick={() => onConfirmReview(platform)}
          type="button"
        >
          {draft.reviewed ? 'Revisión confirmada' : 'Confirmar revisión'}
        </button>
      </div>
      {draft.reviewed ? <p className="generation-draft__reviewed" role="status">Esta pieza está revisada.</p> : null}
      <dl className="generation-draft__metadata">
        <div><dt>Proveedor</dt><dd>{generation.provider}</dd></div>
        <div><dt>Modelo</dt><dd>{generation.model}</dd></div>
        <div><dt>Procesamiento</dt><dd className="generation-draft__location">{processingLocationLabel(generation.processing_location)}</dd></div>
        <div><dt>Prompt</dt><dd>{generation.trace.prompt_version}</dd></div>
      </dl>
    </section>
  )
}

function GenerationFailure({ error }: { error: FailedPlatformGeneration }) {
  return (
    <section className="generation-feedback generation-feedback--error" role="alert">
      <p className="eyebrow">{platformLabels[error.platform]}</p>
      <p>{error.error.detail}</p>
    </section>
  )
}
