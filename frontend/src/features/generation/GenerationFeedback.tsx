import type { GenerationState } from './formState'
import { platformLabels } from './constants'

type GenerationFeedbackProps = {
  generation: GenerationState
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
  return (
    <section className="generation-draft" aria-live="polite" aria-labelledby="draft-heading">
      <p className="eyebrow">Borrador para {platform}</p>
      <h2 id="draft-heading">Revísalo antes de utilizarlo</h2>
      <p className="generation-draft__notice">Es una propuesta inicial: la decisión editorial siempre es tuya.</p>
      <p className="generation-draft__text">{generation.result.text}</p>
      <p className="generation-draft__metadata">Generado con {generation.result.provider} · {generation.result.model}</p>
    </section>
  )
}
