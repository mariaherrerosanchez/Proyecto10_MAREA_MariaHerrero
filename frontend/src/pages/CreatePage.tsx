import { GenerationForm } from '../features/generation/GenerationForm'

export function CreatePage() {
  return (
    <div className="page create-page">
      <header className="create-page__intro">
        <p className="eyebrow">Crear</p>
        <h1>Una idea, <em>tu mirada.</em></h1>
        <p>Define el contexto esencial y genera un primer borrador que podrás revisar con calma.</p>
      </header>
      <GenerationForm />
    </div>
  )
}
