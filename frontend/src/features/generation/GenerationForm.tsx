import type { FormEvent } from 'react'

import { languageOptions, objectiveOptions, toneOptions } from './constants'
import { GenerationFeedback } from './GenerationFeedback'
import { NicheFields } from './NicheFields'
import { PlatformSelector } from './PlatformSelector'
import { useGenerationForm } from './useGenerationForm'

export function GenerationForm() {
  const {
    values,
    errors,
    generation,
    updateField,
    addSelectedNiche,
    removeSelectedNiche,
    toggleSuggestedNiche,
    togglePlatform,
    selectAll,
    setActivePlatform,
    draftReviews,
    beginEditingDraft,
    updateDraft,
    confirmDraftReview,
    submit,
  } = useGenerationForm()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit()
  }

  const isLoading = generation.status === 'loading'

  return (
    <form className="generation-form" noValidate onSubmit={handleSubmit}>
      <section className="generation-form__section generation-form__section--idea" aria-labelledby="idea-heading">
        <div className="generation-form__section-heading">
          <div>
            <p className="eyebrow">Tu punto de partida</p>
            <h2 id="idea-heading">Cuéntale a MAREA tu idea</h2>
          </div>
          <p className="generation-form__required">Campos obligatorios</p>
        </div>
        <label className="form-field form-field--wide" htmlFor="topic">
          <span>Tema o idea</span>
          <textarea
            aria-describedby={errors.topic ? 'topic-error' : undefined}
            id="topic"
            name="topic"
            onChange={(event) => updateField('topic', event.target.value)}
            placeholder="Por ejemplo, cómo aplicar la IA sin perder el criterio humano"
            required
            rows={4}
            value={values.topic}
          />
          {errors.topic ? <small className="form-error" id="topic-error">{errors.topic}</small> : null}
        </label>
        <div className="generation-form__grid">
          <SelectField error={errors.objective} id="objective" label="Objetivo" onChange={(value) => updateField('objective', value)} options={objectiveOptions} value={values.objective} />
          <SelectField error={errors.tone} id="tone" label="Tono" onChange={(value) => updateField('tone', value)} options={toneOptions} value={values.tone} />
          <label className="form-field form-field--wide" htmlFor="audience">
            <span>Audiencia</span>
            <input
              aria-describedby={errors.audience ? 'audience-error' : undefined}
              id="audience"
              name="audience"
              onChange={(event) => updateField('audience', event.target.value)}
              placeholder="Por ejemplo, profesionales no técnicos"
              required
              value={values.audience}
            />
            {errors.audience ? <small className="form-error" id="audience-error">{errors.audience}</small> : null}
          </label>
          <SelectField error={errors.language} id="language" label="Idioma" onChange={(value) => updateField('language', value)} options={languageOptions} value={values.language} />
          <label className="form-field form-field--wide" htmlFor="additional-context">
            <span>Contexto adicional <em>Opcional</em></span>
            <textarea
              id="additional-context"
              name="additional-context"
              onChange={(event) => updateField('additionalContext', event.target.value)}
              placeholder="Datos, matices o límites que quieras tener presentes"
              rows={3}
              value={values.additionalContext}
            />
          </label>
        </div>
      </section>
      <NicheFields
        niches={values.niches}
        onAddNiche={addSelectedNiche}
        onRemoveNiche={removeSelectedNiche}
        onSubnicheChange={(value) => updateField('subniche', value)}
        onToggleSuggestedNiche={toggleSuggestedNiche}
        subniche={values.subniche}
      />
      <PlatformSelector
        activePlatform={values.activePlatform}
        error={errors.platforms}
        onActivePlatformChange={setActivePlatform}
        onSelectAll={selectAll}
        onTogglePlatform={togglePlatform}
        selectedPlatforms={values.selectedPlatforms}
      />
      <div className="generation-form__submit">
        <button className="button button--primary" disabled={isLoading} type="submit">
          {isLoading ? 'Generando borradores…' : 'Generar borradores'}
        </button>
        <p>Generaremos una pieza por plataforma seleccionada. Podrás revisarlas antes de utilizarlas.</p>
      </div>
      <GenerationFeedback
        draftReviews={draftReviews}
        generation={generation}
        initialPlatform={values.activePlatform}
        onBeginEdit={beginEditingDraft}
        onConfirmReview={confirmDraftReview}
        onDraftChange={updateDraft}
      />
    </form>
  )
}

type SelectFieldProps = {
  error?: string
  id: 'objective' | 'tone' | 'language'
  label: string
  onChange: (value: string) => void
  options: readonly string[] | readonly { value: string; label: string }[]
  value: string
}

function SelectField({ error, id, label, onChange, options, value }: SelectFieldProps) {
  const errorId = `${id}-error`
  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      <select aria-describedby={error ? errorId : undefined} id={id} name={id} onChange={(event) => onChange(event.target.value)} required value={value}>
        <option value="">Selecciona una opción</option>
        {options.map((option) => {
          const normalized = typeof option === 'string' ? { value: option, label: option } : option
          return <option key={normalized.value} value={normalized.value}>{normalized.label}</option>
        })}
      </select>
      {error ? <small className="form-error" id={errorId}>{error}</small> : null}
    </label>
  )
}
