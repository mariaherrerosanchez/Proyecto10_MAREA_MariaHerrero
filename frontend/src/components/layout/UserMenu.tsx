import type { UserMenuUser } from '../../mocks/currentUser'

type UserMenuProps = {
  user: UserMenuUser
}

export function UserMenu({ user }: UserMenuProps) {
  return (
    <div className="user-menu">
      <button className="user-menu__notification" type="button" aria-label="Notificaciones">
        <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 24 24">
          <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
      </button>
      <span className="user-menu__name">{user.name}</span>
      <span className="user-menu__avatar" aria-label={`Perfil de ${user.name}`}>
        {user.initials}
      </span>
    </div>
  )
}
