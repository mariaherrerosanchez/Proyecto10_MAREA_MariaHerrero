import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

import mareaLogo from '../../assets/brand/marea-logo.png'
import mareaMonogram from '../../assets/brand/marea-monogram.png'
import sidebarBrand from '../../assets/home/sidebar-brand.png'
import { UserMenu } from '../../components/layout/UserMenu'
import { currentUserMock } from '../../mocks/currentUser'
import { navigationItems } from '../navigation'

type ConnectionState = 'loading' | 'success' | 'error'

type AppShellProps = {
  children: ReactNode
  connectionState: ConnectionState
}

function NavigationIcon({ label }: { label: string }) {
  const sharedProps = {
    'aria-hidden': true,
    className: 'nav-link__icon',
    fill: 'none',
    focusable: false,
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
  }

  switch (label) {
    case 'Inicio':
      return <svg {...sharedProps}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M9 21v-7h6v7" /></svg>
    case 'Crear':
      return <svg {...sharedProps}><path d="m4 20 4.4-1.1L19 8.3a2.1 2.1 0 0 0-3-3L5.4 15.9 4 20Z" /><path d="m14.5 6.8 3 3" /></svg>
    case 'Radar':
      return <svg {...sharedProps}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
    case 'Biblioteca':
      return <svg {...sharedProps}><path d="M3 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v14H5a2 2 0 0 1-2-2V6Z" /><path d="M12 6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7" /></svg>
    case 'Ciencia':
      return <svg {...sharedProps}><path d="M9 3h6" /><path d="M10 3v6l-5.3 8.5A2.3 2.3 0 0 0 6.6 21h10.8a2.3 2.3 0 0 0 1.9-3.5L14 9V3" /><path d="M8 15h8" /></svg>
    case 'Perfiles':
      return <svg {...sharedProps}><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3 3 0 0 1 0 5" /><path d="M17 14.5a4.5 4.5 0 0 1 3.5 4.5" /></svg>
    default:
      return <svg {...sharedProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5.3v-3h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L8.7 5l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.5 1Z" /></svg>
  }
}

function Navigation({ className, includeSecondary = true }: { className: string; includeSecondary?: boolean }) {
  const primaryItems = navigationItems.filter(({ placement }) => placement !== 'secondary')
  const secondaryItems = navigationItems.filter(({ placement }) => placement === 'secondary')

  const renderItems = (items: typeof navigationItems) =>
    items.map(({ label, path }) => (
      <NavLink end={path === '/'} key={path} className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`} to={path}>
        <NavigationIcon label={label} />
        {label}
      </NavLink>
    ))

  return (
    <nav className={className} aria-label="Navegación principal">
      <div className="nav-group">{renderItems(primaryItems)}</div>
      {includeSecondary ? <div className="navigation__lower"><div className="nav-group nav-group--secondary">{renderItems(secondaryItems)}</div></div> : null}
    </nav>
  )
}

export function AppShell({ children, connectionState }: AppShellProps) {
  const connectionLabel = {
    loading: 'Comprobando servicio',
    success: 'Servicio disponible',
    error: 'Servicio no disponible',
  }[connectionState]

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <a className="wordmark" href="/">
          <img className="wordmark__logo" src={mareaLogo} alt="MAREA" />
        </a>
        <Navigation className="sidebar__navigation" includeSecondary={false} />
        <footer className="sidebar__footer">
          <div className="sidebar__brand-block">
            <div className="sidebar__brand-image" aria-hidden="true">
              <img src={sidebarBrand} alt="" />
            </div>
          </div>
          <div className="sidebar__settings">
            <NavLink className="nav-link" to="/configuracion">
              <NavigationIcon label="Configuración" />
              Configuración
            </NavLink>
            <p className={`connection-status connection-status--${connectionState}`} aria-live="polite">
              <span aria-hidden="true" />
              {connectionLabel}
            </p>
          </div>
        </footer>
      </aside>
      <header className="mobile-header">
        <a className="wordmark" href="/">
          <img className="wordmark__monogram" src={mareaMonogram} alt="MAREA" />
        </a>
        <Navigation className="mobile-navigation" />
      </header>
      <main id="main-content" className="main-content">
        <header className="app-shell__topbar">
          <UserMenu user={currentUserMock} />
        </header>
        {children}
      </main>
    </div>
  )
}
