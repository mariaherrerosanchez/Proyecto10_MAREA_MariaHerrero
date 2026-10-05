export type NavigationItem = {
  label: string
  path: string
  placement?: 'primary' | 'secondary'
}

export const navigationItems: NavigationItem[] = [
  { label: 'Inicio', path: '/' },
  { label: 'Crear', path: '/crear' },
  { label: 'Radar', path: '/radar' },
  { label: 'Biblioteca', path: '/biblioteca' },
  { label: 'Ciencia', path: '/ciencia' },
  { label: 'Perfiles', path: '/perfiles' },
  { label: 'Configuración', path: '/configuracion', placement: 'secondary' },
]
