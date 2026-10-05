import { describe, expect, it } from 'vitest'

import { navigationItems } from './navigation'

describe('MAREA navigation', () => {
  it('includes the seven planned sections', () => {
    expect(navigationItems.map(({ label }) => label)).toEqual([
      'Inicio',
      'Crear',
      'Radar',
      'Biblioteca',
      'Ciencia',
      'Perfiles',
      'Configuración',
    ])
  })

  it('keeps settings in the secondary navigation area', () => {
    expect(navigationItems.find(({ label }) => label === 'Configuración')).toMatchObject({
      path: '/configuracion',
      placement: 'secondary',
    })
  })
})
