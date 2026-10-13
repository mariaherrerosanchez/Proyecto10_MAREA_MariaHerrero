import { useLocation } from 'react-router-dom'

import { GenerationForm } from '../features/generation/GenerationForm'
import { isRadarInspiration } from '../features/radar/radarNews'

export function CreatePage() {
  const { state } = useLocation()
  const prefill = isRadarInspiration(state?.radarInspiration) ? state.radarInspiration : undefined

  return (
    <div className="page create-page">
      <header className="create-page__intro">
        <p className="eyebrow">Crear</p>
        <h1>Una idea, <em>tu mirada.</em></h1>
        <p>Define el contexto esencial y genera un primer borrador que podrás revisar con calma.</p>
      </header>
      <GenerationForm prefill={prefill} />
    </div>
  )
}
