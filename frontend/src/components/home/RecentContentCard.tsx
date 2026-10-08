import type { RecentContentMock } from '../../mocks/homeContent'

type RecentContentCardProps = RecentContentMock

function RecentContentIcon({ icon }: Pick<RecentContentMock, 'icon'>) {
  if (icon === 'gallery') {
    return <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1.25" /><path d="m6.5 17 4.2-4.2 2.7 2.7 2-2 2.1 3.5" /></svg>
  }

  return <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 24 24"><path d="M7 3.5h7l3 3V20a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 7 20V3.5Z" /><path d="M14 3.5v3h3M9.5 11h5M9.5 14h5M9.5 17h3" /></svg>
}

export function RecentContentCard({ icon, meta, title, type }: RecentContentCardProps) {
  return (
    <article className="recent-content-card">
      <span className={`recent-content-card__icon recent-content-card__icon--${icon}`}>
        <RecentContentIcon icon={icon} />
      </span>
      <div>
        <h3>{type} · {title}</h3>
        <p className="recent-content-card__meta">{meta}</p>
      </div>
      <span className="recent-content-card__action" aria-hidden="true">•••</span>
    </article>
  )
}
