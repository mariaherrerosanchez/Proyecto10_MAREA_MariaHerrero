import { platforms, type Platform } from '../../generation/types'
import { platformLabels } from './constants'

type PlatformSelectorProps = {
  activePlatform: Platform | null
  selectedPlatforms: Platform[]
  error?: string
  onActivePlatformChange: (platform: Platform) => void
  onSelectAll: () => void
  onTogglePlatform: (platform: Platform) => void
}

export function PlatformSelector({
  activePlatform,
  selectedPlatforms,
  error,
  onActivePlatformChange,
  onSelectAll,
  onTogglePlatform,
}: PlatformSelectorProps) {
  return (
    <section className="generation-form__section" aria-labelledby="platform-heading">
      <div className="generation-form__section-heading">
        <div>
          <p className="eyebrow">Destino</p>
          <h2 id="platform-heading">Plataformas objetivo</h2>
        </div>
        <p className="generation-form__required">Obligatorio</p>
      </div>
      <p className="generation-form__helper">Generaremos una pieza independiente para cada plataforma seleccionada. La principal determina la pestaña inicial.</p>
      <button className="platform-selector__select-all" disabled={selectedPlatforms.length === platforms.length} onClick={onSelectAll} type="button">
        {selectedPlatforms.length === platforms.length ? 'Todas seleccionadas' : 'Seleccionar todas'}
      </button>
      <div className="platform-list" role="group" aria-describedby={error ? 'platform-error' : undefined}>
        {platforms.map((platform) => {
          const selected = selectedPlatforms.includes(platform)
          const active = activePlatform === platform
          return (
            <div className="platform-choice" key={platform}>
              <label className={`platform-chip${selected ? ' platform-chip--selected' : ''}`}>
                <input checked={selected} onChange={() => onTogglePlatform(platform)} type="checkbox" />
                <span>{platformLabels[platform]}</span>
              </label>
              {selected ? (
                <button
                  aria-pressed={active}
                  className={`platform-choice__active${active ? ' platform-choice__active--selected' : ''}`}
                  onClick={() => onActivePlatformChange(platform)}
                  type="button"
                >
                  {active ? 'Principal' : 'Usar como principal'}
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
      {error ? <p className="form-error" id="platform-error">{error}</p> : null}
    </section>
  )
}
