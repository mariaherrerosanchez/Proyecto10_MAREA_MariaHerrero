# Frontend de MAREA

Base de interfaz para MAREA con React, TypeScript y Vite. Esta fase comprueba la conexión con el endpoint `GET /health` del backend; no incorpora rutas, navegación ni funcionalidades de producto.

## Configuración local

La URL de la API se obtiene de `VITE_API_BASE_URL`. Para cambiarla, copia `.env.example` a `.env.local` y ajusta el valor. El valor por defecto para desarrollo es `http://localhost:8000`; no se usan secretos en esta configuración.

## Arranque local

Desde este directorio:

```bash
npm install
npm run dev
```

Vite mostrará la URL local, normalmente `http://localhost:5173`.

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
