# MAREA

> **Una idea que llega más lejos.**

MAREA es una aplicación en desarrollo para transformar una idea, una información o una tendencia en contenido original, adaptado a cada plataforma, audiencia y estilo de comunicación.

El proyecto está concebido como un producto reutilizable y como pieza de portfolio profesional. Se desarrolla en el contexto del bootcamp de Inteligencia Artificial de Factoría F5, bajo la autoría de **María Herrero**.

## El problema

Crear contenido de calidad para varios canales exige tiempo, contexto y adaptación editorial. Reutilizar el mismo texto en LinkedIn, Instagram, Facebook y un blog reduce su pertinencia; además, quienes crean contenido necesitan conservar el control sobre lo que se publica.

## La solución propuesta

MAREA propondrá un flujo asistido por IA que parta de una idea o de una tendencia relevante y genere borradores diferenciados por plataforma. La persona usuaria revisará, editará, regenerará y seleccionará cada pieza antes de copiarla, descargarla o conservarla. La publicación automática no forma parte del flujo inicial.

## Funcionalidades planificadas

- Generación de contenido para LinkedIn, Instagram, Facebook y blog, con adaptación por canal y selección de una, varias o todas las plataformas disponibles.
- Configuración de uno o varios nichos, subnicho o especialización opcional, objetivo, audiencia, tono, idioma y contexto adicional; los nichos podrán elegirse entre sugerencias estáticas o definirse libremente.
- Perfiles reutilizables para personas, marcas, empresas o proyectos, con uno o varios nichos, competencias y preferencias editoriales; las futuras fuentes verificadas conservarán procedencia y autorización sin asumir scraping de redes.
- Cuentas con identidad, preferencias personales y propiedad aislada de perfiles, generaciones, biblioteca e historial; la cuenta se diferenciará de los perfiles de creador o marca.
- Revisión humana, edición, regeneración independiente, guardado, descarte, copia y descarga.
- Radar de tendencias para inspirar contenido original sin copiar publicaciones de terceros, cruzando actualidad, nichos, perfil, competencias reales y audiencia.
- Biblioteca e historial de generaciones.
- Divulgación científica basada en fuentes de arXiv mediante RAG.
- Contexto de actualidad financiera desde una fuente externa.
- Guardrails contra afirmaciones personales no respaldadas y un harness local reproducible para evaluar resultados, separado de los tests de software.
- Trazabilidad de proveedores, modelos, fuentes, resultados y errores; cuando corresponda, se indicará de forma transparente si el procesamiento es local o externo.
- Una arquitectura extensible para futuros conectores de redes sociales e imágenes. La generación visual se gestionará mediante una abstracción de proveedor, priorizando soluciones gratuitas o locales; MAREA seguirá siendo completamente utilizable si este servicio no está disponible.

## Arquitectura prevista

```text
React + TypeScript + Tailwind + shadcn/ui
                │
                ▼
          API FastAPI (Python)
                │
     ┌──────────┼──────────┐
     ▼          ▼          ▼
LangChain   SQLite /    Proveedores LLM
 y flujos   SQLAlchemy   Groq · OpenRouter · Ollama
     │
     ├── Chroma + arXiv (RAG científico)
     ├── fuentes financieras
     └── ImageProvider desacoplado
```

La prioridad es mantener un flujo completo utilizable sin servicios de pago, favoreciendo modelos locales, herramientas de código abierto y planes gratuitos.

## Stack previsto

| Área | Tecnologías previstas |
| --- | --- |
| Frontend | React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI, LangChain |
| Modelos | Ollama, Groq, OpenRouter |
| Datos | SQLite, SQLAlchemy, Chroma |
| Fuentes | arXiv y una fuente externa de mercado financiero |
| Calidad y entrega | Pytest, herramientas de test del ecosistema React, harness local de evaluación, Docker Compose, GitHub Projects |

## Configuración local

Para la configuración privada del backend, crea un archivo `.env` local a partir de `.env.example`. El backend carga ese archivo durante el desarrollo y las variables reales del entorno tienen prioridad sobre sus valores.

La configuración del navegador se mantiene separada en `frontend/.env.local`, creado a partir de `frontend/.env.example`. Actualmente solo utiliza `VITE_API_BASE_URL`.

Las variables con prefijo `VITE_` se incluyen en el bundle del navegador y son públicas. Nunca deben contener API keys, credenciales, URLs de base de datos, secretos de sesión ni otra información sensible.

### Groq local y selección de modelo (US-008, US-023)

El proveedor integrado es Groq. Para activarlo localmente, copia `.env.example` a `.env` y configura únicamente en ese archivo privado `LLM_PROVIDER=groq`, `GROQ_MODEL` y `GROQ_API_KEY`. `GROQ_MODEL` es el modelo predeterminado y la plantilla propone `openai/gpt-oss-120b`. Puedes habilitar hasta dos opciones adicionales con `GROQ_MODEL_SECONDARY` y `GROQ_MODEL_TERTIARY` después de verificar que estén disponibles para tu cuenta de Groq. La pantalla **Crear** muestra solo los modelos que el backend tenga configurados, usando sus identificadores reales y sin exponer credenciales.

No se versiona la clave ni se expone mediante `VITE_*`. Cada generación, generación multicanal y regeneración conserva la selección solicitada y devuelve el proveedor y modelo efectivos en su traza temporal.

Para una comprobación manual —no ejecutada por la suite— inicia el backend desde `backend/`:

```powershell
uv run uvicorn app.main:app --reload
```

Después, en otra terminal, puede comprobarse el endpoint técnico estructurado sin interfaz. `niches` y `audience` son campos distintos; `niches` admite cero, uno o varios ámbitos combinados. El subnicho o especialización adicional, el contexto adicional y el contexto editorial de perfil son opcionales:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/generation `
  -ContentType "application/json" -Body '{
    "topic":"Explica qué es MAREA en dos frases.",
    "niches":["Tecnología", "QA / Testing"],
    "objective":"Divulgación",
    "audience":"Profesionales no técnicos",
    "tone":"Cercano y profesional",
    "language":"es",
    "platform":"linkedin"
  }'
```

La respuesta incluye temporalmente una traza con la versión de prompt y el contexto usado. Aún no se persiste; la persistencia de trazabilidad pertenece a historias posteriores. Las pruebas automatizadas no contactan con Groq ni requieren una clave real.

### Radar RSS (MVP)

El backend expone `GET /radar/news` para consultar señales de actualidad procedentes exclusivamente de una lista cerrada de fuentes RSS públicas verificadas. La configuración usa identificadores —no URLs arbitrarias— en `RADAR_RSS_SOURCES`; por defecto incluye los feeds oficiales de [Tecnología](https://elpais.com/info/rss/) y Ciencia de EL PAÍS. Cada resultado conserva titular, fuente, fecha de publicación cuando existe, enlace original y fecha de consulta. No descarga artículos completos, no consulta redes sociales ni envía noticias a un LLM.

Los errores de una fuente no bloquean las demás: la respuesta incluye el estado seguro de cada origen y puede devolver una lista vacía cuando ninguna esté disponible. Estas noticias son señales de actualidad, no tendencias verificadas ni contenido generado; el filtrado por nichos, perfil y competencias pertenece a una fase posterior del Radar.

### Radar RSS (MVP)

El backend expone `GET /radar/news` para consultar señales de actualidad procedentes exclusivamente de una lista cerrada de fuentes RSS públicas verificadas. La configuración usa identificadores —no URLs arbitrarias— en `RADAR_RSS_SOURCES`; por defecto incluye los feeds oficiales de [Tecnología](https://elpais.com/info/rss/) y Ciencia de EL PAÍS. Cada resultado conserva titular, fuente, fecha de publicación cuando existe, enlace original y fecha de consulta. No descarga artículos completos, no consulta redes sociales ni envía noticias a un LLM.

Los errores de una fuente no bloquean las demás: la respuesta incluye el estado seguro de cada origen y puede devolver una lista vacía cuando ninguna esté disponible. Estas noticias son señales de actualidad, no tendencias verificadas ni contenido generado; el filtrado por nichos, perfil y competencias pertenece a una fase posterior del Radar.

## Ejecutar con Docker Compose

El entorno Docker del MVP contiene únicamente dos servicios: el backend FastAPI y el frontend estático. No inicia bases de datos, Chroma, Ollama ni otros servicios que todavía no utiliza la aplicación.

### Preparación

Se necesita Docker Desktop en ejecución. Crea el archivo privado de configuración a partir de la plantilla y completa la configuración de Groq solo si quieres ejecutar una generación real:

```powershell
Copy-Item .env.example .env
```

En `.env`, configura `LLM_PROVIDER=groq`, `GROQ_MODEL` y `GROQ_API_KEY`. `GROQ_MODEL` es el predeterminado; `GROQ_MODEL_SECONDARY` y `GROQ_MODEL_TERTIARY` son opcionales y deben contener solo modelos previamente verificados para la cuenta de Groq. Este archivo está ignorado por Git, se inyecta únicamente en tiempo de ejecución del servicio backend y nunca se copia a una imagen Docker. No incluyas claves en `VITE_API_BASE_URL` ni en ninguna variable `VITE_*`: esas variables son públicas y se compilan en el navegador.

Por defecto, el frontend se compila para usar `http://localhost:8001`. Si necesitas otra URL pública de API, define `VITE_API_BASE_URL` antes de construir; el cambio exige reconstruir el frontend.

### Construcción y arranque

Desde la raíz del repositorio:

```powershell
docker compose build
docker compose up -d
docker compose ps
```

El frontend estará disponible en `http://localhost:8080` y el backend Docker en `http://localhost:8001`. Dentro de la red Docker, Uvicorn sigue escuchando en el puerto 8000. El backend restringe CORS al origen Docker del frontend (`http://localhost:8080`). El navegador accede al backend mediante `localhost`, no mediante el nombre interno del servicio Docker.

### Validación

Comprueba primero el healthcheck desde PowerShell:

```powershell
Invoke-RestMethod http://localhost:8001/health
```

Después abre `http://localhost:8080`, accede a **Crear** y verifica que el estado de servicio aparece disponible. Con Groq configurado explícitamente, la validación end-to-end manual consiste en generar un borrador para una o varias plataformas, editar o regenerar una pieza, confirmar su revisión y copiar o descargar el resultado. Esta prueba puede realizar una llamada externa a Groq; no forma parte de las pruebas automatizadas.

Para detener únicamente el entorno de MAREA:

```powershell
docker compose down
```

### Problemas frecuentes

- Si Docker Desktop no está iniciado, `docker compose build` no podrá crear las imágenes.
- Si el puerto 8001 u 8080 está ocupado, libera el proceso local o ajusta el mapeo de puertos y el origen CORS de forma coherente.
- Si la interfaz indica que el servicio no está disponible, comprueba `docker compose ps`, el healthcheck de `http://localhost:8001/health` y que el navegador se ha abierto en `http://localhost:8080`.
- Si la generación devuelve un error controlado, revisa que `LLM_PROVIDER`, `GROQ_MODEL` y `GROQ_API_KEY` estén configurados en `.env`. Si una opción adicional no aparece en **Crear**, revisa sin compartir secretos que su variable `GROQ_MODEL_SECONDARY` o `GROQ_MODEL_TERTIARY` no esté vacía y que ese modelo esté disponible para tu cuenta. No incluyas ni compartas el valor de la clave en logs o capturas.
- Si cambia `VITE_API_BASE_URL`, reconstruye el servicio frontend para generar un nuevo bundle.

## Roadmap

| Nivel | Alcance |
| --- | --- |
| Esencial (P0) | Flujo funcional de generación, guardrails mínimos, evaluación reproducible, presentación transparente, plataformas, nichos, audiencia, tono, edición, copia/descarga y README. |
| Medio (P1) | Docker, dos LLM, perfiles, fuentes verificadas, personalización, imágenes, persistencia, historial y retención de datos. |
| Avanzado (P2) | ES/EN/FR/IT, trazabilidad, Radar, actualidad financiera y RAG científico con arXiv y Chroma. |
| Experto | Multiagentes. |
| Stretch | Ollama, imágenes, perfiles/fuentes, Radar, RAG científico, LangSmith y Graph RAG, sin compromiso de entrega. |

## Estado actual

**Base técnica y experiencia inicial implementadas.** El repositorio cuenta con backend FastAPI, frontend React + TypeScript, comunicación local de comprobación y un layout responsive. Los flujos funcionales de generación, perfiles, cuenta, persistencia y Radar siguen planificados.

## Estructura actual

```text
MAREA/
├── .env.example        # Variables previstas, sin secretos
├── .gitignore          # Exclusiones locales y de build
├── README.md           # Presentación del proyecto
├── backend/             # Base FastAPI
├── frontend/            # Base React + TypeScript
├── scripts/             # Automatización auxiliar
└── specs/
    └── MASTER_SPEC.md  # Especificación maestra
```

La convención de estructura, nombres y ramas se define en la sección 9.1 de la especificación maestra.

## Próximos pasos

Completar el flujo mínimo de generación local y avanzar en perfiles, cuenta, persistencia y Radar según los hitos definidos antes de ampliar proveedores o capacidades avanzadas.

## Entregables previstos

- Repositorio GitHub documentado, con README y documentación técnica.
- Kanban de gestión mediante GitHub Projects.
- Demo en vivo, presentación técnica y artículo publicado en Medium.

## Autora

**María Herrero**
