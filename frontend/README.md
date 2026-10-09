# Frontend de MAREA

Interfaz de MAREA con React, TypeScript y Vite. Incluye navegación, la pantalla de creación y el flujo de generación, revisión, regeneración y salida de borradores. La URL de la API se configura separadamente del backend.

## Configuración local

La URL de la API se obtiene de `VITE_API_BASE_URL`. Para cambiarla, copia `.env.example` a `.env.local` y ajusta el valor. El valor por defecto para desarrollo es `http://localhost:8000`; no se usan secretos en esta configuración.

## Arranque local

Desde este directorio:

```bash
npm install
npm run dev
```

Vite mostrará la URL local, normalmente `http://localhost:5173`.

## Docker

El entorno reproducible de frontend se construye y sirve con Nginx mediante Docker Compose desde la raíz del repositorio. Consulta las instrucciones de preparación, arranque y validación en el [README raíz](../README.md#ejecutar-con-docker-compose).

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
