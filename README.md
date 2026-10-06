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
- Configuración de nicho, subnicho opcional, objetivo, audiencia, tono, idioma y contexto; el nicho podrá elegirse entre sugerencias o definirse libremente.
- Perfiles reutilizables para personas, marcas, empresas o proyectos, con uno o varios nichos, competencias y preferencias editoriales.
- Cuentas con identidad, preferencias personales y propiedad aislada de perfiles, generaciones, biblioteca e historial; la cuenta se diferenciará de los perfiles de creador o marca.
- Revisión humana, edición, regeneración independiente, guardado, descarte, copia y descarga.
- Radar de tendencias para inspirar contenido original sin copiar publicaciones de terceros, cruzando actualidad, nicho, perfil, competencias reales y audiencia.
- Biblioteca e historial de generaciones.
- Divulgación científica basada en fuentes de arXiv mediante RAG.
- Contexto de actualidad financiera desde una fuente externa.
- Trazabilidad de proveedores, modelos, fuentes, resultados y errores.
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
| Calidad y entrega | Pytest, herramientas de test del ecosistema React, Docker Compose, GitHub Projects |

## Configuración local

Para la configuración privada del backend, crea un archivo `.env` local a partir de `.env.example`. El backend carga ese archivo durante el desarrollo y las variables reales del entorno tienen prioridad sobre sus valores.

La configuración del navegador se mantiene separada en `frontend/.env.local`, creado a partir de `frontend/.env.example`. Actualmente solo utiliza `VITE_API_BASE_URL`.

Las variables con prefijo `VITE_` se incluyen en el bundle del navegador y son públicas. Nunca deben contener API keys, credenciales, URLs de base de datos, secretos de sesión ni otra información sensible.

### Groq local (US-008)

El primer proveedor integrado es Groq. Para activarlo localmente, copia `.env.example` a `.env` y configura únicamente en ese archivo privado `LLM_PROVIDER=groq`, `GROQ_MODEL` y `GROQ_API_KEY`. No se versiona la clave ni se expone mediante `VITE_*`.

Para una comprobación manual —no ejecutada por la suite— inicia el backend desde `backend/`:

```powershell
uv run uvicorn app.main:app --reload
```

Después, en otra terminal, puede comprobarse el endpoint técnico estructurado sin interfaz. `niche` y `audience` son campos distintos; el subnicho, contexto adicional y contexto editorial de perfil son opcionales:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/generation `
  -ContentType "application/json" -Body '{
    "topic":"Explica qué es MAREA en dos frases.",
    "niche":"Tecnología",
    "objective":"Divulgación",
    "audience":"Profesionales no técnicos",
    "tone":"Cercano y profesional",
    "language":"es",
    "platform":"linkedin"
  }'
```

La respuesta incluye temporalmente una traza con la versión de prompt y el contexto usado. Aún no se persiste; la persistencia de trazabilidad pertenece a historias posteriores. Las pruebas automatizadas no contactan con Groq ni requieren una clave real.

## Roadmap

| Nivel | Alcance |
| --- | --- |
| Esencial (P0) | Flujo funcional de generación, plataformas, nicho, audiencia, tono, edición, copia/descarga y README. |
| Medio (P1) | Docker, dos LLM, perfiles, personalización, imágenes, persistencia e historial. |
| Avanzado (P2) | ES/EN/FR/IT, trazabilidad, Radar, actualidad financiera y RAG científico con arXiv y Chroma. |
| Experto | Multiagentes, evaluación y guardrails. |
| Stretch | Graph RAG, sin compromiso de entrega. |

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
