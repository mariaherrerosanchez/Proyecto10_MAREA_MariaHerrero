import type { GenerationState } from './formState'
import type { GenerationResponse, GuardrailAssessment } from '../../generation/types'
import { platformLabels } from './constants'
import { DraftContent } from './DraftContent'
import { processingLocationLabel, reviewMessage } from './draftPresentation'

type DraftPresentationResponse = Omit<GenerationResponse, 'guardrails' | 'processing_location'> & {
  guardrails?: GuardrailAssessment | null
  processing_location?: unknown
}

type GenerationFeedbackProps = {
  generation: Omit<GenerationState, 'result'> & {
    result: DraftPresentationResponse | null
  }
}

export function GenerationFeedback({ generation }: GenerationFeedbackProps) {
  if (generation.status === 'idle') {
    return null
  }

  if (generation.status === 'loading') {
    return <p className="generation-feedback generation-feedback--loading" aria-live="polite">MAREA está preparando tu borrador…</p>
  }

  if (generation.status === 'error') {
    return <p className="generation-feedback generation-feedback--error" role="alert">{generation.error}</p>
  }

  if (generation.result === null) {
    return null
  }

  const platform = platformLabels[generation.result.trace.context.platform]
  const guardrailReviewMessage = reviewMessage(generation.result.guardrails)
  return (
    <section className="generation-draft" aria-live="polite" aria-labelledby="draft-heading">
      <p className="eyebrow">Borrador para {platform}</p>
      <h2 id="draft-heading">Revísalo antes de utilizarlo</h2>
      <p className="generation-draft__notice">Es una propuesta inicial: la decisión editorial siempre es tuya.</p>
      {guardrailReviewMessage ? <p className="generation-draft__review-alert" role="status">{guardrailReviewMessage}</p> : null}
      <DraftContent text={generation.result.text} />
      <dl className="generation-draft__metadata">
        <div>
          <dt>Proveedor</dt>
          <dd>{generation.result.provider}</dd>
        </div>
        <div>
          <dt>Modelo</dt>
          <dd>{generation.result.model}</dd>
        </div>
        <div>
          <dt>Procesamiento</dt>
          <dd className="generation-draft__location">{processingLocationLabel(generation.result.processing_location)}</dd>
        </div>
      </dl>
    </section>
  )
}
