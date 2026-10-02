import { useEffect, useState } from 'react'

import { createApiClient } from '../services/api'

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
    <main>
      <h1>MAREA</h1>
      <p>Una idea que llega más lejos.</p>
      <section aria-live="polite" aria-label="Estado de conexión">
        {connectionState === 'loading' && <p>Comprobando conexión con el servicio…</p>}
        {connectionState === 'success' && <p>Servicio disponible.</p>}
        {connectionState === 'error' && <p>No se pudo conectar con el servicio. Inténtalo de nuevo más tarde.</p>}
      </section>
    </main>
  )
}

export default App
