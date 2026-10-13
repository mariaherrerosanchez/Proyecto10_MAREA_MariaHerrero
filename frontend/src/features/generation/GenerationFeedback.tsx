import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import type {
  FailedPlatformGeneration,
  GuardrailAssessment,
  Platform,
  SuccessfulPlatformGeneration,
  TranslationLanguage,
} from '../../generation/types'
import type { GenerationState } from './formState'
import type { DraftReviewState, ReviewedDraft } from './draftReviewState'
import type { PlatformRegenerationState } from './regenerationState'
import { platformLabels } from './constants'
import { DraftContent } from './DraftContent'
import { ImageSearchPanel } from './ImageSearchPanel'
import { copyDraftText, downloadDraftText } from './draftOutput'
import { processingLocationLabel, reviewMessage } from './draftPresentation'
import { initialResultPlatform, shouldInitializeResultTab } from './resultTabs'
import {
  clearStockImage,
  selectStockImage,
  selectUploadedImage,
  suggestedImageQuery,
  type SelectedContentImage,
  type SelectedStockImages,
  type UploadedImage,
} from './stockImageState'
import type { StockImage } from '../../images/types'
import type { DraftTranslation, TranslationState } from './translationState'

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
  translations: TranslationState
  translationErrors: Partial<Record<Platform, string>>
  translationInProgress: boolean
  onTranslate: (platform: Platform, text: string, targetLanguage: TranslationLanguage) => Promise<void>
  onConfirmTranslationReview: (platform: Platform) => void
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
  translations,
  translationErrors,
  translationInProgress,
  onTranslate,
  onConfirmTranslationReview,
}: GenerationFeedbackProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(initialPlatform)
  const [outputFeedback, setOutputFeedback] = useState<Partial<Record<Platform, DraftOutputFeedback>>>({})
  const [selectedImages, setSelectedImages] = useState<SelectedStockImages>({})
  const [imageQueries, setImageQueries] = useState<Partial<Record<Platform, string>>>({})
  const hadGenerationResult = useRef(false)
  const tabRefs = useRef<Partial<Record<Platform, HTMLButtonElement>>>({})

  useEffect(() => {
    const hasCurrentResult = generation.result !== null
    if (shouldInitializeResultTab(hadGenerationResult.current, hasCurrentResult) && generation.result !== null) {
      setSelectedPlatform(initialResultPlatform(generation.result, initialPlatform))
    }
    hadGenerationResult.current = hasCurrentResult
  }, [generation.result, initialPlatform])

  useEffect(() => {
    if (generation.status === 'loading') {
      setSelectedImages({})
      setImageQueries({})
    }
  }, [generation.status])

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
                setSelectedImages((current) => clearStockImage(current, platform))
                onBeginEdit(platform)
              }}
              onConfirmReview={onConfirmReview}
              onCopy={copyDraft}
              onDownload={downloadDraft}
              onDraftChange={(platform, text) => {
                clearOutputFeedback(platform)
                setSelectedImages((current) => clearStockImage(current, platform))
                onDraftChange(platform, text)
              }}
              onRegenerate={(platform) => {
                clearOutputFeedback(platform)
                setSelectedImages((current) => clearStockImage(current, platform))
                onRegenerate(platform)
              }}
              imageQuery={imageQueries[activeResult.platform]
                ?? suggestedImageQuery(
                  activeResult.generation.trace.context.topic,
                  activeResult.generation.trace.context.niches,
                )}
              onImageQueryChange={(platform, query) => {
                setImageQueries((current) => ({ ...current, [platform]: query }))
              }}
              onSelectImage={(platform, image) => {
                setSelectedImages((current) => selectStockImage(current, platform, image))
              }}
              onSelectUploadedImage={(platform, image) => {
                setSelectedImages((current) => selectUploadedImage(current, platform, image))
              }}
              onRemoveImage={(platform) => {
                setSelectedImages((current) => clearStockImage(current, platform))
              }}
              outputFeedback={outputFeedback[activeResult.platform]}
              platform={activeResult.platform}
              regeneration={regenerations[activeResult.platform]}
              selectedImage={selectedImages[activeResult.platform]}
              translation={translations[activeResult.platform]}
              translationError={translationErrors[activeResult.platform]}
              translationInProgress={translationInProgress}
              onTranslate={onTranslate}
              onConfirmTranslationReview={onConfirmTranslationReview}
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
  imageQuery: string
  onImageQueryChange: (platform: Platform, query: string) => void
  onSelectImage: (platform: Platform, image: StockImage) => void
  onSelectUploadedImage: (platform: Platform, image: UploadedImage) => void
  onRemoveImage: (platform: Platform) => void
  outputFeedback: DraftOutputFeedback | undefined
  platform: Platform
  regeneration: PlatformRegenerationState[Platform]
  selectedImage: SelectedContentImage | undefined
  translation: DraftTranslation | undefined
  translationError: string | undefined
  translationInProgress: boolean
  onTranslate: (platform: Platform, text: string, targetLanguage: TranslationLanguage) => Promise<void>
  onConfirmTranslationReview: (platform: Platform) => void
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
  imageQuery,
  onImageQueryChange,
  onSelectImage,
  onSelectUploadedImage,
  onRemoveImage,
  outputFeedback,
  platform,
  regeneration,
  selectedImage,
  translation,
  translationError,
  translationInProgress,
  onTranslate,
  onConfirmTranslationReview,
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
      {draft.reviewed ? (
        <TranslationPanel
          disabled={isRegenerating}
          error={translationError}
          onConfirmReview={() => onConfirmTranslationReview(platform)}
          onTranslate={(targetLanguage) => onTranslate(platform, draft.text, targetLanguage)}
          translating={translationInProgress}
          translation={translation}
        />
      ) : null}
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
      {draft.reviewed ? (
        <ImageSearchPanel
          onQueryChange={(query) => onImageQueryChange(platform, query)}
          onSelect={(image) => onSelectImage(platform, image)}
          onSelectUpload={(image) => onSelectUploadedImage(platform, image)}
          onRemoveImage={() => onRemoveImage(platform)}
          query={imageQuery}
          selectedImage={selectedImage}
        />
      ) : null}
      <dl className="generation-draft__metadata">
        <div><dt>Proveedor</dt><dd>{generation.provider}</dd></div>
        <div><dt>Modelo</dt><dd>{generation.model}</dd></div>
        <div><dt>Procesamiento</dt><dd className="generation-draft__location">{processingLocationLabel(generation.processing_location)}</dd></div>
        <div><dt>Prompt</dt><dd>{generation.trace.prompt_version}</dd></div>
      </dl>
    </section>
  )
}

const translationLanguageLabels: Record<TranslationLanguage, string> = {
  en: 'Inglés',
  fr: 'Francés',
  it: 'Italiano',
}

function TranslationPanel({
  disabled,
  error,
  onConfirmReview,
  onTranslate,
  translating,
  translation,
}: {
  disabled: boolean
  error: string | undefined
  onConfirmReview: () => void
  onTranslate: (targetLanguage: TranslationLanguage) => Promise<void>
  translating: boolean
  translation: DraftTranslation | undefined
}) {
  const [targetLanguage, setTargetLanguage] = useState<TranslationLanguage>(translation?.language ?? 'en')
  const [copyFeedback, setCopyFeedback] = useState<string | undefined>()

  async function copyTranslation() {
    if (translation === undefined) {
      return
    }
    try {
      await copyDraftText(translation.text)
      setCopyFeedback('Traducción copiada al portapapeles.')
    } catch {
      setCopyFeedback('No se pudo copiar la traducción. Inténtalo de nuevo.')
    }
  }

  return (
    <section className="translation-panel" aria-labelledby="translation-heading">
      <div>
        <p className="eyebrow">Versión internacional</p>
        <h3 id="translation-heading">Traduce este borrador</h3>
        <p>La traducción se crea a partir del texto revisado; no genera una publicación nueva.</p>
      </div>
      <label className="form-field" htmlFor="translation-language">
        <span>Idioma de destino</span>
        <select
          disabled={disabled || translating}
          id="translation-language"
          onChange={(event) => setTargetLanguage(event.target.value as TranslationLanguage)}
          value={targetLanguage}
        >
          {Object.entries(translationLanguageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <button
        className="generation-draft__action"
        disabled={disabled || translating}
        onClick={() => void onTranslate(targetLanguage)}
        type="button"
      >
        {translating ? 'Traduciendo…' : 'Traducir'}
      </button>
      {error ? <p className="generation-feedback generation-feedback--error" role="alert">{error}</p> : null}
      {translation ? (
        <section className="translation-panel__result" aria-live="polite" aria-label={`Traducción al ${translationLanguageLabels[translation.language]}`}>
          <p className="eyebrow">Traducción al {translationLanguageLabels[translation.language]}</p>
          <DraftContent text={translation.text} />
          <p className="generation-draft__notice">Revísala antes de utilizarla: la decisión editorial siempre es tuya.</p>
          <div className="generation-draft__actions">
            <button
              className="generation-draft__action generation-draft__action--review"
              disabled={translation.reviewed}
              onClick={onConfirmReview}
              type="button"
            >
              {translation.reviewed ? 'Revisión confirmada' : 'Confirmar revisión de la traducción'}
            </button>
            <button
              className="generation-draft__action"
              disabled={!translation.reviewed}
              onClick={() => void copyTranslation()}
              type="button"
            >
              Copiar traducción
            </button>
          </div>
          {copyFeedback ? <p className="generation-draft__output-message" role="status">{copyFeedback}</p> : null}
          <dl className="translation-panel__metadata">
            <div><dt>Proveedor</dt><dd>{translation.provider}</dd></div>
            <div><dt>Modelo</dt><dd>{translation.model}</dd></div>
          </dl>
        </section>
      ) : null}
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
