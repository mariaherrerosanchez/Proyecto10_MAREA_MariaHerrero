import { Link } from 'react-router-dom'

import heroWave from '../assets/brand/marea-hero-wave.png'
import { RecentContentCard } from '../components/home/RecentContentCard'
import { TrendCard } from '../components/home/TrendCard'
import { homeRecentContentMocks, homeTrendMocks } from '../mocks/homeContent'

export function HomePage() {
  return (
    <div className="page page--home">
      <section className="hero" aria-labelledby="home-title">
        <div className="hero__visual" aria-hidden="true">
          <img className="hero__image" src={heroWave} alt="" />
        </div>
        <div className="hero__wash" aria-hidden="true" />
        <div className="hero__copy">
          <p className="eyebrow">MAREA · CONTENIDO CON INTENCIÓN</p>
          <h1 id="home-title">
            <span>Una idea que</span>
            <em>llega más lejos.</em>
          </h1>
          <p className="hero__description">
            Convierte una intuición en contenido pensado para cada lugar y cada audiencia.
          </p>
          <Link className="button button--primary" to="/crear">
            Empezar a crear <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="content-section" aria-labelledby="trends-title">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">Radar</p>
            <h2 id="trends-title">Ideas en tendencia</h2>
            <p className="section-description">Inspiración actual para crear contenido relevante en tus canales.</p>
          </div>
          <Link className="section-action" to="/radar">
            Ver todas las tendencias <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="trend-grid">
          {homeTrendMocks.map((trend) => (
            <TrendCard key={trend.platform} {...trend} />
          ))}
        </div>
      </section>

      <section className="content-section" aria-labelledby="continue-title">
        <div className="recent-content-panel">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">Tu espacio</p>
              <h2 id="continue-title">Continúa donde lo dejaste</h2>
              <p className="section-description">Retoma tus proyectos y sigue creando.</p>
            </div>
            <Link className="section-action" to="/biblioteca">
              Ver todos mis contenidos <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="recent-content-list">
            {homeRecentContentMocks.map((content) => (
              <RecentContentCard key={content.type} {...content} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
