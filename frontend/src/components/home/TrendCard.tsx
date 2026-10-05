import { Link } from 'react-router-dom'

import type { TrendMock } from '../../mocks/homeContent'

type TrendCardProps = TrendMock

export function TrendCard({ description, image, platform, title, visualTone }: TrendCardProps) {
  return (
    <article className="trend-card">
      <div className={`trend-card__thumbnail trend-card__thumbnail--${visualTone}${image ? ' trend-card__thumbnail--with-image' : ''}`} aria-hidden="true">
        {image ? <img src={image} alt="" /> : null}
      </div>
      <div className="trend-card__body">
        <p className="trend-card__platform">{platform}</p>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <Link className="trend-card__action" to="/radar" aria-label={`Ver la idea ${title} en Radar`}>
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  )
}
