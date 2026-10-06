# MAREA — Especificación maestra

**Tagline:** _Una idea que llega más lejos._  
**Estado:** planificación activa con base técnica implementada
**Autora:** María Herrero

## 1. Visión

MAREA será una aplicación profesional de generación y gestión de contenido con IA generativa. Convertirá una idea, información o tendencia en propuestas originales para diferentes plataformas, audiencias y estilos. Se diseñará como producto reutilizable, configurable y apto para portfolio profesional, en el contexto del bootcamp de IA de Factoría F5.

El producto deberá priorizar modelos locales, herramientas abiertas y planes gratuitos para que el flujo principal sea utilizable sin contratar servicios de pago.

## 2. Problema y propuesta de valor

La creación multicanal suele producir textos repetidos, exige repetir trabajo editorial y dificulta conservar el contexto de una marca o profesional. MAREA centralizará ese contexto y propondrá contenido específico por plataforma, manteniendo siempre la decisión editorial en manos de la persona usuaria.

## 3. Cuentas y perfiles

La Cuenta identifica a quien accede a MAREA y es distinta de los perfiles de creador, marca, empresa o proyecto. Una cuenta dispondrá de identidad básica, sesión y preferencias personales persistentes; será propietaria de sus perfiles, generaciones, piezas, biblioteca e historial. La elección concreta del mecanismo de autenticación se decidirá en implementación, sin asumir en esta fase recuperación de contraseña, verificación de email, OAuth, proveedores externos, roles o administración.

Las preferencias de cuenta podrán incluir sector o ámbito profesional, intereses y temáticas, plataformas preferidas y preferencias predeterminadas de generación. Funcionarán como valores por defecto y podrán modificarse.

Los perfiles podrán representar personas, marcas, empresas o proyectos. Cada perfil deberá admitir: nombre, descripción, profesión o sector, experiencia, conocimientos y competencias, uno o varios nichos con sus subnichos opcionales, audiencia, objetivos, tono, estilo, temas principales, temas a evitar, información de marca, instrucciones personalizadas y plataformas habituales.

Los perfiles pertenecerán a una cuenta y no sustituirán su identidad ni sus preferencias personales. El uso de perfiles evitará depender de cambios en el código para personalizar generaciones de distintos usuarios.

El nicho define el ámbito o sector temático en el que se posiciona el contenido; la audiencia define para quién se crea. Son datos distintos y se conservarán como tales. Los nichos no estarán cerrados ni asociados a una persona concreta: se podrán elegir entre sugerencias o introducir de forma personalizada, y un perfil podrá trabajar con más de uno.

## 4. Alcance funcional

### 4.1 Crear desde una idea

La persona usuaria proporcionará tema o idea, objetivo, audiencia, tono, idioma, contexto adicional y podrá seleccionar una plataforma, varias o todas las disponibles. Podrá elegir cero, uno o varios nichos recomendados o personalizados; son ámbitos que pueden combinarse y no serán obligatorios para generar contenido. El subnicho o especialización adicional será opcional. Las plataformas iniciales son LinkedIn, Instagram, Facebook y blog.

El sistema generará propuestas adaptadas; no reutilizará un único texto sin cambios. El contexto de generación combinará perfil, uno o varios nichos, subnicho o especialización adicional, audiencia, objetivo, plataforma, tono, idioma, contexto adicional y tema solicitado. Cada resultado será independiente por plataforma y podrá visualizarse, editarse, regenerarse, copiarse, descargarse, guardarse o descartarse. Regenerar una pieza no deberá alterar las demás ya aprobadas.

Cuando exista cuenta, el contexto se resolverá con esta precedencia: **solicitud actual > perfil seleccionado > preferencias de cuenta**. Las preferencias de cuenta son defaults editables y nunca impedirán una sobrescritura consciente de la persona usuaria.

### 4.2 Radar de tendencias

El Radar buscará temas actuales y los cruzará con el nicho o subnicho, el perfil, los conocimientos y competencias reales del creador y la audiencia. Cuando no exista un contexto más específico, podrá usar las preferencias de cuenta como fallback. Conceptualmente: tendencias actuales + nicho/subnicho + perfil + competencias reales + audiencia → propuestas originales de contenido.

Su objetivo es usar la actualidad como señal para inspirar oportunidades originales compatibles con el perfil; no copiará ni parafraseará publicaciones de terceros, ni recomendará contenido que obligue a aparentar conocimientos o experiencia inexistentes.

### 4.3 Revisión humana y salida

El flujo obligatorio será:

```text
idea o tendencia → generación → revisión → edición opcional → selección → publicación, copia o descarga
```

MAREA no publicará automáticamente tras generar contenido. Para la entrega académica no se conectarán cuentas personales; aun sin integraciones sociales, siempre se ofrecerá copia o descarga. La arquitectura deberá permitir añadir conectores de publicación en el futuro.

### 4.4 Imagen

La generación de imágenes se abstraerá detrás de un `ImageProvider`. Deberá poder usar alternativas gratuitas o locales y no bloqueará el funcionamiento del producto cuando no esté disponible.

### 4.5 Idiomas

Los idiomas objetivo son castellano, inglés, francés e italiano.

### 4.6 Divulgación científica (RAG)

El modo científico se centrará inicialmente en IA y machine learning. Flujo conceptual:

```text
arXiv → documentos → procesamiento → chunks → embeddings → Chroma → retriever → LLM → contenido divulgativo con fuentes
```

Las fuentes deberán conservarse y mostrarse como soporte del resultado.

### 4.7 Actualidad financiera

Una fuente o API externa proporcionará datos de mercados actualizados al LLM. La selección concreta del proveedor se decidirá en implementación priorizando coste, condiciones de uso y fiabilidad.

## 5. Requisitos no funcionales

- El flujo P0 será funcional con alternativas gratuitas/locales.
- La salida debe conservar separación por plataforma y trazabilidad suficiente para depurarla.
- Las claves y secretos no se versionarán; se documentarán mediante `.env.example`.
- La aplicación será extensible respecto a LLM, imágenes y conectores sociales.
- La interfaz prevista será profesional y evitará una estética genérica de producto de IA; comunicará movimiento, creación, expansión y comunicación.

## 6. Trazabilidad y persistencia

Se persistirán con SQLite y SQLAlchemy: cuentas, preferencias de cuenta, perfiles, configuraciones, generaciones, contenidos, fuentes, trazabilidad y metadatos. Las relaciones de propiedad permitirán consultar y aislar los datos de la cuenta activa.

Cuando proceda, cada generación registrará timestamp, proveedor, modelo, tipo de generación, configuración, plataforma, duración, fuentes, resultado y errores. LangSmith podrá evaluarse como apoyo opcional de observabilidad.

## 7. Arquitectura técnica prevista

| Capa | Decisión prevista |
| --- | --- |
| Interfaz | React, TypeScript, Tailwind CSS y shadcn/ui |
| API | FastAPI y Python |
| Orquestación LLM | LangChain |
| LLM cloud | Groq y OpenRouter |
| LLM local | Ollama |
| Persistencia | SQLite y SQLAlchemy |
| Vectorial | Chroma |
| RAG | LangChain y arXiv |
| Pruebas | Pytest y herramientas apropiadas del ecosistema React |
| Entrega | Docker Compose y GitHub Projects |

Navegación prevista: Inicio, Crear, Radar, Biblioteca, Ciencia, Perfiles y Configuración.

## 8. Priorización y roadmap

| Prioridad | Nivel | Entregables funcionales |
| --- | --- | --- |
| P0 | Esencial | Frontend funcional, generación de texto, selección de plataformas, LinkedIn, Instagram, Facebook, blog, nicho, audiencia, tono, prompt engineering, edición, copia/descarga y README. |
| P1 | Medio | Docker, dos LLM, cuentas, perfiles, personalización, imágenes, persistencia e historial. |
| P2 | Avanzado | ES/EN/FR/IT, trazabilidad, Radar, noticias financieras, RAG científico, arXiv y Chroma. |
| P3 | Experto | Multiagentes, evaluación y guardrails. |
| Stretch | Experimental | Graph RAG; no es requisito comprometido. |

## 9. Límites de la fase actual

La base técnica ya incluye los directorios `frontend/` y `backend/`, aplicaciones iniciales y comunicación local de comprobación. Las capacidades de producto se implementarán progresivamente conforme al roadmap; esta especificación no afirma que una capacidad planificada esté disponible antes de su historia correspondiente.

### 9.1 Convención inicial de estructura y nombres

- `frontend/` alberga la aplicación React + TypeScript.
- `backend/` alberga la API FastAPI y su código Python.
- `specs/` contiene las especificaciones y decisiones de producto y arquitectura.
- `scripts/` contiene scripts auxiliares de automatización y mantenimiento del repositorio.
- Los archivos y directorios usarán nombres descriptivos en minúsculas y `kebab-case`, salvo los nombres convencionales del ecosistema (por ejemplo, `README.md`, `.gitignore` o `MASTER_SPEC.md`).
- Las ramas seguirán el patrón: `main` para versiones estables, `dev` para integración, `feature/<descripcion>` para funcionalidades, `fix/<descripcion>` para correcciones y `docs/<descripcion>` para documentación. Las descripciones usarán `kebab-case`.

## 10. Entregables del proyecto

- Repositorio GitHub documentado.
- README y documentación técnica.
- Kanban de gestión mediante GitHub Projects.
- Demo en vivo.
- Presentación técnica.
- Artículo publicado en Medium.

## 11. Decisiones abiertas

- Elegir la fuente financiera concreta y revisar sus límites de uso.
- Definir modelos locales mínimos y requisitos de hardware para Ollama.
- Determinar el proveedor o implementación inicial de `ImageProvider`.
- Concretar el esquema de datos, contratos API y criterios de calidad antes de construir P0.
- Evaluar LangSmith según privacidad, coste y necesidad de observabilidad.
- Elegir el mecanismo de autenticación, almacenamiento de credenciales y gestión de sesión para las cuentas, manteniendo fuera de alcance por ahora recuperación de contraseña, verificación de email, OAuth, proveedores externos, roles y administración.
