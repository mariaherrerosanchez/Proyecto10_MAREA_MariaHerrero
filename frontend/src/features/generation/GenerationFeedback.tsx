import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import type {
  FailedPlatformGeneration,
  GuardrailAssessment,
  Platform,
  SuccessfulPlatformGeneration,
} from '../../generation/types'
import type { GenerationState } from './formState'
import type { DraftReviewState, ReviewedDraft } from './draftReviewState'
import type { PlatformRegenerationState } from './regenerationState'
import { platformLabels } from './constants'
import { DraftContent } from './DraftContent'
import { copyDraftText, downloadDraftText } from './draftOutput'
import { processingLocationLabel, reviewMessage } from './draftPresentation'
import { initialResultPlatform, shouldInitializeResultTab } from './resultTabs'

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
  onRegenerate: (platform: Platform) => void
  regenerations: PlatformRegenerationState
}

type DraftOutputFeedback = {
  message: string
  status: 'loading' | 'success' | 'error'
}

export function GenerationFeedback({
  draftReviews,
  generation,
  initialPlatform,
  onBeginEdit,
  onConfirmReview,
  onDraftChange,
  onRegenerate,
  regenerations,
}: GenerationFeedbackProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(initialPlatform)
  const [outputFeedback, setOutputFeedback] = useState<Partial<Record<Platform, DraftOutputFeedback>>>({})
  const hadGenerationResult = useRef(false)
  const tabRefs = useRef<Partial<Record<Platform, HTMLButtonElement>>>({})

  useEffect(() => {
    const hasCurrentResult = generation.result !== null
    if (shouldInitializeResultTab(hadGenerationResult.current, hasCurrentResult) && generation.result !== null) {
      setSelectedPlatform(initialResultPlatform(generation.result, initialPlatform))
    }
    hadGenerationResult.current = hasCurrentResult
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

  function clearOutputFeedback(platform: Platform) {
    setOutputFeedback((current) => {
      const next = { ...current }
      delete next[platform]
      return next
    })
  }

  async function copyDraft(platform: Platform, text: string) {
    setOutputFeedback((current) => ({
      ...current,
      [platform]: { status: 'loading', message: 'Copiando texto…' },
    }))
    try {
      await copyDraftText(text)
      setOutputFeedback((current) => ({
        ...current,
        [platform]: { status: 'success', message: 'Texto copiado al portapapeles.' },
      }))
    } catch {
      setOutputFeedback((current) => ({
        ...current,
        [platform]: { status: 'error', message: 'No se pudo copiar el texto. Inténtalo de nuevo.' },
      }))
    }
  }

  function downloadDraft(platform: Platform, text: string, topic: string) {
    try {
      downloadDraftText(text, platform, topic)
      setOutputFeedback((current) => ({
        ...current,
        [platform]: { status: 'success', message: 'Descarga iniciada.' },
      }))
    } catch {
      setOutputFeedback((current) => ({
        ...current,
        [platform]: { status: 'error', message: 'No se pudo preparar la descarga. Inténtalo de nuevo.' },
      }))
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
              onBeginEdit={(platform) => {
                clearOutputFeedback(platform)
                onBeginEdit(platform)
              }}
              onConfirmReview={onConfirmReview}
              onCopy={copyDraft}
              onDownload={downloadDraft}
              onDraftChange={(platform, text) => {
                clearOutputFeedback(platform)
                onDraftChange(platform, text)
              }}
              onRegenerate={(platform) => {
                clearOutputFeedback(platform)
                onRegenerate(platform)
              }}
              outputFeedback={outputFeedback[activeResult.platform]}
              platform={activeResult.platform}
              regeneration={regenerations[activeResult.platform]}
            />
          : <GenerationFailure
              error={activeResult}
              onRegenerate={onRegenerate}
              regeneration={regenerations[activeResult.platform]}
            />}
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
  onCopy: (platform: Platform, text: string) => Promise<void>
  onDownload: (platform: Platform, text: string, topic: string) => void
  onDraftChange: (platform: Platform, text: string) => void
  onRegenerate: (platform: Platform) => void
  outputFeedback: DraftOutputFeedback | undefined
  platform: Platform
  regeneration: PlatformRegenerationState[Platform]
}

function GeneratedDraft({
  draft,
  generation,
  onBeginEdit,
  onConfirmReview,
  onCopy,
  onDownload,
  onDraftChange,
  onRegenerate,
  outputFeedback,
  platform,
  regeneration,
}: GeneratedDraftProps) {
  const [isEditing, setIsEditing] = useState(false)
  const guardrailReviewMessage = reviewMessage(generation.guardrails)
  const isRegenerating = regeneration?.status === 'loading'
  const outputEnabled = draft.reviewed && !isRegenerating
  const outputLoading = outputFeedback?.status === 'loading'
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
            disabled={isRegenerating}
            onChange={(event) => onDraftChange(platform, event.target.value)}
            rows={12}
            value={draft.text}
          />
        </label>
      ) : <DraftContent text={draft.text} />}
      <div className="generation-draft__actions">
        {isEditing ? (
          <button className="generation-draft__action" disabled={isRegenerating} onClick={() => setIsEditing(false)} type="button">
            Terminar edición
          </button>
        ) : (
          <button
            className="generation-draft__action"
            onClick={() => {
              onBeginEdit(platform)
              setIsEditing(true)
            }}
            disabled={isRegenerating}
            type="button"
          >
            Editar borrador
          </button>
        )}
        <button
          className="generation-draft__action generation-draft__action--review"
          disabled={draft.reviewed || isRegenerating}
          onClick={() => onConfirmReview(platform)}
          type="button"
        >
          {draft.reviewed ? 'Revisión confirmada' : 'Confirmar revisión'}
        </button>
        <button
          className="generation-draft__action"
          disabled={isRegenerating}
          onClick={() => onRegenerate(platform)}
          type="button"
        >
          {isRegenerating ? 'Regenerando…' : 'Regenerar borrador'}
        </button>
      </div>
      {draft.reviewed ? <p className="generation-draft__reviewed" role="status">Esta pieza está revisada.</p> : null}
      {isRegenerating ? <p className="generation-draft__regeneration" role="status">MAREA está regenerando esta pieza…</p> : null}
      {regeneration?.status === 'error' ? <p className="generation-feedback generation-feedback--error" role="alert">{regeneration.error}</p> : null}
      <div className="generation-draft__output" aria-describedby={`draft-output-help-${platform}`}>
        <p id={`draft-output-help-${platform}`}>
          {draft.reviewed
            ? 'Puedes copiar o descargar esta revisión.'
            : 'Confirma la revisión para habilitar la copia y la descarga.'}
        </p>
        <div className="generation-draft__actions">
          <button
            className="generation-draft__action"
            disabled={!outputEnabled || outputLoading}
            onClick={() => void onCopy(platform, draft.text)}
            type="button"
          >
            {outputLoading ? 'Copiando…' : 'Copiar texto'}
          </button>
          <button
            className="generation-draft__action"
            disabled={!outputEnabled || outputLoading}
            onClick={() => onDownload(platform, draft.text, generation.trace.context.topic)}
            type="button"
          >
            Descargar .txt
          </button>
        </div>
        {outputFeedback?.status === 'success' ? <p className="generation-draft__output-message" role="status">{outputFeedback.message}</p> : null}
        {outputFeedback?.status === 'error' ? <p className="generation-feedback generation-feedback--error" role="alert">{outputFeedback.message}</p> : null}
      </div>
      <dl className="generation-draft__metadata">
        <div><dt>Proveedor</dt><dd>{generation.provider}</dd></div>
        <div><dt>Modelo</dt><dd>{generation.model}</dd></div>
        <div><dt>Procesamiento</dt><dd className="generation-draft__location">{processingLocationLabel(generation.processing_location)}</dd></div>
        <div><dt>Prompt</dt><dd>{generation.trace.prompt_version}</dd></div>
      </dl>
    </section>
  )
}

function GenerationFailure({
  error,
  onRegenerate,
  regeneration,
}: {
  error: FailedPlatformGeneration
  onRegenerate: (platform: Platform) => void
  regeneration: PlatformRegenerationState[Platform]
}) {
  const isRegenerating = regeneration?.status === 'loading'
  return (
    <section className="generation-feedback generation-feedback--error" role="alert">
      <p className="eyebrow">{platformLabels[error.platform]}</p>
      <p>{error.error.detail}</p>
      <button
        className="generation-draft__action"
        disabled={isRegenerating}
        onClick={() => onRegenerate(error.platform)}
        type="button"
      >
        {isRegenerating ? 'Reintentando…' : 'Reintentar generación'}
      </button>
      {regeneration?.status === 'error' ? <p role="alert">{regeneration.error}</p> : null}
    </section>
  )
}
