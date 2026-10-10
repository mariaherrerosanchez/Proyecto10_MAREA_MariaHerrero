import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'

import { AppShell } from './layout/AppShell'
import { createApiClient } from '../services/api'
import { HomePage } from '../pages/HomePage'
import { CreatePage } from '../pages/CreatePage'
import { RadarPage } from '../pages/RadarPage'
import { SectionPlaceholder } from '../pages/SectionPlaceholder'

type ConnectionState = 'loading' | 'success' | 'error'

function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading')

  useEffect(() => {
    let isCurrent = true

    void createApiClient()
      .getHealth()
      .then(() => {
        if (isCurrent) {
          setConnectionState('success')
        }
      })
      .catch(() => {
        if (isCurrent) {
          setConnectionState('error')
        }
      })

    return () => {
      isCurrent = false
    }
  }, [])

  return (
    <AppShell connectionState={connectionState}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/crear" element={<CreatePage />} />
        <Route path="/radar" element={<RadarPage />} />
        <Route path="/biblioteca" element={<SectionPlaceholder title="Biblioteca" />} />
        <Route path="/ciencia" element={<SectionPlaceholder title="Ciencia" />} />
        <Route path="/perfiles" element={<SectionPlaceholder title="Perfiles" />} />
        <Route path="/configuracion" element={<SectionPlaceholder title="Configuración" />} />
      </Routes>
    </AppShell>
  )
}

export default App
