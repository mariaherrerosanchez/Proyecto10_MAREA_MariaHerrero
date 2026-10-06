import { useState } from 'react'

import { isNicheSelected } from './formState'
import { suggestedNiches } from './constants'

type NicheFieldsProps = {
  niches: string[]
  subniche: string
  onAddNiche: (value: string) => void
  onRemoveNiche: (value: string) => void
  onSubnicheChange: (value: string) => void
  onToggleSuggestedNiche: (value: string) => void
}

export function NicheFields({
  niches,
  subniche,
  onAddNiche,
  onRemoveNiche,
  onSubnicheChange,
  onToggleSuggestedNiche,
}: NicheFieldsProps) {
  const [customNiche, setCustomNiche] = useState('')

  function addCustomNiche() {
    onAddNiche(customNiche)
    setCustomNiche('')
  }

  return (
    <section className="generation-form__section" aria-labelledby="niche-heading">
      <div className="generation-form__section-heading">
        <div>
          <p className="eyebrow">Contexto editorial</p>
          <h2 id="niche-heading">Nichos y audiencia, sin confundirlos</h2>
        </div>
        <p className="generation-form__recommendation">Recomendado</p>
      </div>
      <div className="generation-form__explanation">
        <p><strong>Nichos</strong> = ámbitos o temáticas que pueden combinarse.</p>
        <p><strong>Audiencia</strong> = personas para quienes estás creando el contenido.</p>
      </div>
      <div className="custom-niche-entry">
        <label className="form-field" htmlFor="custom-niche">
          <span>Añade un nicho</span>
          <input
            id="custom-niche"
            name="custom-niche"
            onChange={(event) => setCustomNiche(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addCustomNiche()
              }
            }}
            placeholder="Elige una sugerencia o escribe el tuyo"
            value={customNiche}
          />
        </label>
        <button className="custom-niche-entry__button" onClick={addCustomNiche} type="button">Añadir</button>
      </div>
      <div className="suggestion-list" aria-label="Nichos sugeridos">
        {suggestedNiches.map((suggestedNiche) => (
          <button
            aria-pressed={isNicheSelected(niches, suggestedNiche)}
            className={`suggestion-chip${isNicheSelected(niches, suggestedNiche) ? ' suggestion-chip--selected' : ''}`}
            key={suggestedNiche}
            onClick={() => onToggleSuggestedNiche(suggestedNiche)}
            type="button"
          >
            {suggestedNiche}
          </button>
        ))}
      </div>
      {niches.length > 0 ? (
        <div className="selected-niches" aria-label="Nichos seleccionados">
          {niches.map((niche) => (
            <span className="selected-niche" key={niche}>
              {niche}
              <button aria-label={`Eliminar nicho ${niche}`} onClick={() => onRemoveNiche(niche)} type="button">×</button>
            </span>
          ))}
        </div>
      ) : null}
      <label className="form-field" htmlFor="subniche">
        <span>Subnicho o especialización adicional <em>Opcional</em></span>
        <input
          id="subniche"
          name="subniche"
          onChange={(event) => onSubnicheChange(event.target.value)}
          placeholder="Por ejemplo, evaluación de sistemas de IA"
          value={subniche}
        />
      </label>
    </section>
  )
}
