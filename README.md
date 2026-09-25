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
- Configuración de objetivo, audiencia, tono, idioma y contexto.
- Perfiles reutilizables para personas, marcas, empresas o proyectos.
- Revisión humana, edición, regeneración independiente, guardado, descarte, copia y descarga.
- Radar de tendencias para inspirar contenido original sin copiar publicaciones de terceros.
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

## Roadmap

| Nivel | Alcance |
| --- | --- |
| Esencial (P0) | Flujo funcional de generación, plataformas, audiencia, tono, edición, copia/descarga y README. |
| Medio (P1) | Docker, dos LLM, perfiles, personalización, imágenes, persistencia e historial. |
| Avanzado (P2) | ES/EN/FR/IT, trazabilidad, Radar, actualidad financiera y RAG científico con arXiv y Chroma. |
| Experto | Multiagentes, evaluación y guardrails. |
| Stretch | Graph RAG, sin compromiso de entrega. |

## Estado actual

**Fase de definición y configuración inicial.** En este momento el repositorio solo contiene la especificación maestra, este README y plantillas de configuración. Todavía no se han creado el frontend, el backend, dependencias ni funcionalidades ejecutables.

## Estructura inicial

```text
MAREA/
├── .env.example        # Variables previstas, sin secretos
├── .gitignore          # Exclusiones locales y de build
├── README.md           # Presentación del proyecto
└── specs/
    └── MASTER_SPEC.md  # Especificación maestra
```

La convención de estructura, nombres y ramas se define en la sección 9.1 de la especificación maestra. Los directorios de aplicación se crearán únicamente al iniciar su implementación.

## Próximos pasos

Definir los hitos de P0, crear la estructura técnica cuando corresponda y validar un flujo mínimo de generación local antes de ampliar proveedores o capacidades avanzadas.

## Entregables previstos

- Repositorio GitHub documentado, con README y documentación técnica.
- Kanban de gestión mediante GitHub Projects.
- Demo en vivo, presentación técnica y artículo publicado en Medium.

## Autora

**María Herrero**
