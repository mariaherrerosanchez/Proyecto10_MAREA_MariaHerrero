#!/usr/bin/env bash
# Creates the initial MAREA backlog. Review this file before executing it.
set -euo pipefail

REPO="mariaherrerosanchez/Proyecto10_MAREA_MariaHerrero"
PROJECT_NUMBER=2
PROJECT_OWNER="mariaherrerosanchez"
created=0
skipped=0

command -v gh >/dev/null 2>&1 || { echo "Error: GitHub CLI (gh) no está disponible." >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Error: GitHub CLI no está autenticado." >&2; exit 1; }

issue_in_project() {
  local issue_url="$1"
  gh project item-list "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --limit 1000 --format json \
    --jq ".items[] | select(.content.url == \"$issue_url\") | .id" | grep -q .
}

add_issue_to_project() {
  local title="$1" issue_url="$2"
  if issue_in_project "$issue_url"; then
    echo "Ya pertenece al Project #$PROJECT_NUMBER: $title"
  else
    gh project item-add "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --url "$issue_url" >/dev/null
    echo "Añadida al Project #$PROJECT_NUMBER (estado predeterminado Backlog): $title"
  fi
}

create_issue() {
  local title="$1" epic_code="$2" epic_name="$3" epic_label="$4" milestone="$5" priority="$6" role="$7" goal="$8" value="$9" criteria="${10}"
  local existing_titles issue_url body
  existing_titles="$(gh issue list --repo "$REPO" --state all --search "\"$title\" in:title" --limit 1000 --json title --jq '.[].title')"
  if printf '%s\n' "$existing_titles" | grep -Fxq "$title"; then
    echo "Omitida (ya existe): $title"
    issue_url="$(gh issue list --repo "$REPO" --state all --search "\"$title\" in:title" --limit 1000 --json title,url --jq ".[] | select(.title == \"$title\") | .url")"
    if [[ -z "$issue_url" ]]; then
      echo "Error: no se pudo localizar la URL de la Issue existente: $title" >&2
      exit 1
    fi
    add_issue_to_project "$title" "$issue_url"
    ((skipped+=1))
    return
  fi
  body=$(cat <<EOF
## Historia de usuario

Como $role,
quiero $goal,
para $value.

## Criterios de aceptación

$criteria

## Información

- Épica: $epic_code — $epic_name
- Milestone: $milestone
- Prioridad: $priority
EOF
)
  issue_url="$(gh issue create --repo "$REPO" --title "$title" --body "$body" --milestone "$milestone" --label "$epic_label" --label "priority:$priority")"
  echo "Creada: $title"
  add_issue_to_project "$title" "$issue_url"
  ((created+=1))
}

# EP01 — Fundación | M1 — 🌱 MAREA nace | P0
create_issue "US-001 — Inicializar estructura profesional del repositorio" "EP01" "Fundación" "epic:foundation" "M1 — 🌱 MAREA nace" "P0" "desarrolladora del proyecto" "inicializar una estructura de repositorio clara" "disponer de una base mantenible para MAREA" $'- El repositorio separa la documentación, scripts y futuras capas de aplicación.\n- Existe una convención documentada para nombres y ubicación de archivos.\n- La estructura no incluye todavía código de frontend ni backend.\n- Los archivos de configuración inicial son coherentes con la estructura.'
create_issue "US-002 — Configurar backend FastAPI" "EP01" "Fundación" "epic:foundation" "M1 — 🌱 MAREA nace" "P0" "desarrolladora" "configurar la base del backend FastAPI" "exponer una API preparada para los flujos de MAREA" $'- El servicio FastAPI puede iniciarse en entorno local.\n- Se define un punto de comprobación de salud de la API.\n- La configuración del servicio se obtiene de variables de entorno.\n- La API permite configurar orígenes permitidos para el frontend.'
create_issue "US-003 — Configurar frontend React + TypeScript" "EP01" "Fundación" "epic:foundation" "M1 — 🌱 MAREA nace" "P0" "desarrolladora" "configurar el frontend con React y TypeScript" "contar con una interfaz mantenible y tipada" $'- El proyecto usa React y TypeScript.\n- El arranque local está documentado.\n- La configuración no contiene claves ni secretos.\n- La estructura admite las pantallas previstas de MAREA.'
create_issue "US-004 — Establecer comunicación frontend-backend" "EP01" "Fundación" "epic:foundation" "M1 — 🌱 MAREA nace" "P0" "persona usuaria" "que la interfaz se comunique con la API" "usar los flujos de generación desde una única experiencia" $'- El frontend consulta un endpoint de comprobación del backend.\n- La URL de la API se configura por variable de entorno.\n- Se informa de un error de conexión sin exponer detalles internos.\n- La comunicación respeta la configuración CORS del backend.'

# EP02 — Experiencia de usuario | M1 — 🌱 MAREA nace | P0
create_issue "US-005 — Crear layout, navegación y design system responsive" "EP02" "Experiencia de usuario" "epic:ux" "M1 — 🌱 MAREA nace" "P0" "persona creadora" "navegar por una interfaz coherente y adaptable" "acceder con claridad a las áreas de MAREA" $'- La navegación incluye Inicio, Crear, Radar, Biblioteca, Ciencia, Perfiles y Configuración.\n- El layout se adapta a pantalla pequeña y grande.\n- Los componentes visuales comparten tipografía, espaciado y estados consistentes.\n- La identidad visual comunica movimiento, creación, expansión y comunicación.\n- La interfaz evita una apariencia genérica de producto de IA.'

# EP17 — Entrega | M1 / M8
create_issue "US-006 — Configurar secretos y variables de entorno" "EP17" "Entrega" "epic:delivery" "M1 — 🌱 MAREA nace" "P0" "desarrolladora" "configurar variables de entorno de forma segura" "cambiar proveedores y entornos sin versionar secretos" $'- Existe un archivo .env.example sin secretos reales.\n- Las claves de Groq, OpenRouter y LangSmith se leen desde el entorno.\n- La configuración de Ollama, base de datos y frontend puede ajustarse por variables.\n- Los archivos .env están ignorados por Git y .env.example no lo está.'

# EP03 — LLM | M2 / M4
create_issue "US-007 — Integrar LangChain y abstracción de proveedores LLM" "EP03" "LLM" "epic:llm" "M2 — ✨ Primera ola" "P0" "desarrolladora" "usar una abstracción común de proveedores LLM" "cambiar entre modelos sin reescribir el flujo de contenido" $'- La capa de generación depende de una interfaz de proveedor definida.\n- LangChain orquesta la llamada al modelo seleccionado.\n- La configuración identifica proveedor y modelo usados.\n- Un fallo de proveedor produce un error controlado y trazable.'
create_issue "US-008 — Integrar primer LLM gratuito" "EP03" "LLM" "epic:llm" "M2 — ✨ Primera ola" "P0" "persona creadora" "generar contenido con un primer modelo accesible" "probar el flujo esencial sin contratar servicios de pago" $'- Se puede seleccionar un modelo gratuito o local configurado.\n- Una solicitud válida devuelve texto generado.\n- La respuesta identifica el proveedor y modelo usados.\n- Un proveedor no configurado no impide mostrar una explicación útil.'
create_issue "US-009 — Implementar sistema estructurado de prompts" "EP03" "LLM" "epic:llm" "M2 — ✨ Primera ola" "P0" "persona creadora" "aportar contexto estructurado a la generación" "obtener resultados alineados con mi objetivo, nicho y audiencia" $'- El prompt incorpora tema, nicho, subnicho opcional, objetivo, audiencia, tono, idioma y contexto adicional.\n- El prompt recibe la plataforma solicitada como dato diferenciado.\n- Las instrucciones, nichos y competencias del perfil pueden añadirse sin modificar el código del prompt base.\n- Nicho y audiencia se conservan como campos de contexto diferenciados.\n- La configuración usada queda disponible para trazabilidad.'

# EP04 — Contenido | M2 / M3
create_issue "US-010 — Crear formulario de generación de contenido" "EP04" "Contenido" "epic:content" "M2 — ✨ Primera ola" "P0" "persona creadora" "introducir los datos de una idea" "solicitar contenido adaptado de forma guiada" $'- El formulario solicita tema o idea, objetivo, audiencia, tono, idioma y contexto adicional; el nicho es recomendado, pero no obligatorio.\n- Ofrece nichos sugeridos y permite introducir un nicho personalizado y un subnicho opcional.\n- Los campos obligatorios se validan sin requerir nicho ni subnicho.\n- Explica o diferencia visualmente nicho y audiencia.\n- Permite elegir las plataformas objetivo.\n- Muestra el estado de la solicitud y los errores recuperables.'
create_issue "US-011 — Generar contenido específico para LinkedIn" "EP04" "Contenido" "epic:content" "M2 — ✨ Primera ola" "P0" "persona creadora" "obtener una propuesta para LinkedIn" "comunicar la idea según las características de ese canal" $'- La generación recibe LinkedIn como plataforma objetivo.\n- El resultado se guarda como pieza identificada para LinkedIn.\n- La pieza puede revisarse sin afectar otras plataformas.\n- La configuración de generación queda asociada al resultado.'
create_issue "US-012 — Generar contenido específico para Instagram" "EP04" "Contenido" "epic:content" "M2 — ✨ Primera ola" "P0" "persona creadora" "obtener una propuesta para Instagram" "comunicar la idea según las características de ese canal" $'- La generación recibe Instagram como plataforma objetivo.\n- El resultado se guarda como pieza identificada para Instagram.\n- La pieza puede revisarse sin afectar otras plataformas.\n- La configuración de generación queda asociada al resultado.'
create_issue "US-013 — Generar contenido específico para Facebook" "EP04" "Contenido" "epic:content" "M2 — ✨ Primera ola" "P0" "persona creadora" "obtener una propuesta para Facebook" "comunicar la idea según las características de ese canal" $'- La generación recibe Facebook como plataforma objetivo.\n- El resultado se guarda como pieza identificada para Facebook.\n- La pieza puede revisarse sin afectar otras plataformas.\n- La configuración de generación queda asociada al resultado.'
create_issue "US-014 — Generar contenido específico para Blog" "EP04" "Contenido" "epic:content" "M2 — ✨ Primera ola" "P0" "persona creadora" "obtener una propuesta para Blog" "comunicar la idea según las características de ese canal" $'- La generación recibe Blog como plataforma objetivo.\n- El resultado se guarda como pieza identificada para Blog.\n- La pieza puede revisarse sin afectar otras plataformas.\n- La configuración de generación queda asociada al resultado.'
create_issue "US-015 — Seleccionar múltiples plataformas simultáneamente" "EP04" "Contenido" "epic:content" "M3 — 🌊 Multicanal real" "P0" "persona creadora" "seleccionar una, varias o todas las plataformas" "crear una campaña multicanal desde una misma idea" $'- Se puede elegir una única plataforma.\n- Se pueden elegir varias plataformas simultáneamente.\n- Existe una acción para seleccionar todas las plataformas disponibles.\n- Cada plataforma seleccionada genera una pieza independiente.\n- La selección se conserva durante la solicitud.'
create_issue "US-016 — Revisar y editar cada contenido generado" "EP04" "Contenido" "epic:content" "M3 — 🌊 Multicanal real" "P0" "persona creadora" "revisar y editar cada pieza antes de usarla" "mantener el control editorial del contenido" $'- Cada resultado se muestra antes de cualquier acción de salida.\n- El texto de cada plataforma se puede editar.\n- La edición de una pieza no modifica las demás.\n- Se puede seleccionar una pieza revisada para conservarla.\n- No existe publicación automática después de generar.'
create_issue "US-017 — Regenerar independientemente una plataforma" "EP04" "Contenido" "epic:content" "M3 — 🌊 Multicanal real" "P0" "persona creadora" "regenerar solo una pieza de plataforma" "mejorar un resultado sin perder los demás" $'- La acción de regeneración se inicia desde una pieza concreta.\n- La nueva generación conserva el contexto de la solicitud original.\n- Las piezas de otras plataformas no se modifican.\n- La versión anterior puede distinguirse de la regenerada en el historial.'

# EP08 — Publicación y salida | M3 / M5
create_issue "US-018 — Copiar y descargar contenido generado" "EP08" "Publicación y salida" "epic:publishing" "M3 — 🌊 Multicanal real" "P0" "persona creadora" "copiar o descargar una pieza revisada" "utilizarla aunque no haya integración social" $'- Cada pieza permite copiar su texto al portapapeles.\n- Cada pieza permite descargarse en un formato de texto.\n- Copiar o descargar no publica contenido en ninguna red.\n- La acción confirma éxito o informa de fallo recuperable.'
create_issue "US-027 — Exportar un paquete multicanal de contenido" "EP08" "Publicación y salida" "epic:publishing" "M5 — 🎨 Contenido completo" "P1" "persona creadora" "exportar un conjunto de piezas multicanal" "reutilizar una campaña completa fuera de MAREA" $'- La exportación incluye las piezas seleccionadas y su plataforma.\n- El paquete distingue claramente cada contenido.\n- Se pueden excluir piezas no aprobadas.\n- La exportación no requiere conectar cuentas sociales.'
create_issue "US-028 — Preparar arquitectura segura para publicación social" "EP08" "Publicación y salida" "epic:publishing" "M5 — 🎨 Contenido completo" "P1" "desarrolladora" "preparar conectores de publicación desacoplados" "poder integrar redes sociales en el futuro sin alterar la generación" $'- La publicación se define mediante una abstracción de conector.\n- Ningún conector publica sin una acción explícita posterior a la revisión.\n- La ausencia de conectores mantiene disponibles copia y descarga.\n- Las credenciales de conectores se obtienen desde variables de entorno.'

# EP05 — Perfiles | M4
create_issue "US-019 — Crear y gestionar perfiles de creador/marca" "EP05" "Perfiles" "epic:profiles" "M4 — 👤 Tu voz, no la de la IA" "P1" "persona creadora" "crear y gestionar perfiles configurables" "adaptar MAREA a personas, marcas, empresas o proyectos" $'- Se pueden crear perfiles de persona, marca, empresa o proyecto.\n- Un perfil admite nombre, descripción y profesión o sector.\n- Un perfil admite experiencia, conocimientos y competencias.\n- Un perfil permite asociar uno o varios nichos, subnichos opcionales y temas permitidos o evitados.\n- Un perfil admite audiencia, objetivos, tono, estilo y plataformas habituales.\n- Se pueden actualizar y consultar perfiles existentes.'
create_issue "US-020 — Aplicar voz, competencias y preferencias del perfil" "EP05" "Perfiles" "epic:profiles" "M4 — 👤 Tu voz, no la de la IA" "P1" "persona creadora" "aplicar mi perfil a una generación" "obtener contenido acorde a mi voz y contexto" $'- La generación puede asociarse a un perfil elegido.\n- El contexto incluye nichos, subnichos, tono, estilo, audiencia y objetivos del perfil.\n- Se incluyen conocimientos, competencias, temas principales y temas a evitar.\n- Nicho y audiencia se aplican como datos distintos.\n- Se aplican instrucciones personalizadas e información de marca cuando existan.\n- El perfil aplicado queda registrado con la generación.'

# EP06 — Biblioteca | M4
create_issue "US-021 — Implementar SQLite + SQLAlchemy" "EP06" "Biblioteca y persistencia" "epic:library" "M4 — 👤 Tu voz, no la de la IA" "P1" "desarrolladora" "persistir los datos de MAREA con SQLite y SQLAlchemy" "conservar información sin depender de un servicio de pago" $'- La aplicación usa SQLite como base de datos local.\n- SQLAlchemy gestiona el acceso a datos.\n- Se persisten perfiles, configuraciones, generaciones y contenidos.\n- Los perfiles persisten uno o varios nichos y sus subnichos opcionales.\n- La ubicación de la base de datos se configura por entorno.'
create_issue "US-022 — Guardar y consultar biblioteca/historial" "EP06" "Biblioteca y persistencia" "epic:library" "M4 — 👤 Tu voz, no la de la IA" "P1" "persona creadora" "guardar y consultar mis generaciones" "recuperar contenido y contexto previamente creados" $'- Una generación puede guardarse con sus piezas por plataforma.\n- La biblioteca muestra contenido y plataforma asociados.\n- Se puede consultar la configuración, incluidos nicho y subnicho, y el perfil usados.\n- Un contenido puede marcarse como descartado sin eliminar la trazabilidad necesaria.'

# EP03 — LLM | M4
create_issue "US-023 — Integrar un segundo proveedor/modelo LLM" "EP03" "LLM" "epic:llm" "M4 — 👤 Tu voz, no la de la IA" "P1" "desarrolladora" "integrar un segundo proveedor o modelo LLM" "disponer de alternativa ante límites o fallos del proveedor inicial" $'- El segundo proveedor se configura de forma independiente.\n- La abstracción existente permite seleccionarlo sin duplicar el flujo.\n- La trazabilidad identifica el proveedor y modelo efectivos.\n- Un fallo del proveedor seleccionado se comunica de forma controlada.'
create_issue "US-024 — Integrar ejecución local mediante Ollama" "EP03" "LLM" "epic:llm" "M4 — 👤 Tu voz, no la de la IA" "P1" "persona creadora" "usar un modelo local mediante Ollama" "generar contenido sin depender de un servicio de pago" $'- La URL y el modelo de Ollama son configurables.\n- Ollama puede seleccionarse como proveedor de generación.\n- La aplicación informa claramente si el servicio local no está disponible.\n- Las generaciones con Ollama registran proveedor y modelo.'

# EP07 — Imágenes | M5
create_issue "US-025 — Generar imágenes mediante proveedor gratuito/local" "EP07" "Imágenes" "epic:images" "M5 — 🎨 Contenido completo" "P1" "persona creadora" "generar imágenes mediante un proveedor desacoplado" "acompañar el contenido sin bloquear el flujo textual" $'- La integración usa una abstracción ImageProvider.\n- Se prioriza un proveedor gratuito o local.\n- La indisponibilidad del proveedor no impide generar ni gestionar texto.\n- Se registra el proveedor usado cuando la imagen se genera.'
create_issue "US-026 — Asociar, visualizar y descargar imágenes" "EP07" "Imágenes" "epic:images" "M5 — 🎨 Contenido completo" "P1" "persona creadora" "asociar imágenes a mis piezas" "preparar contenido multicanal completo" $'- Una imagen puede asociarse a una pieza de contenido.\n- La interfaz permite visualizar la imagen asociada.\n- La imagen puede descargarse cuando exista.\n- La ausencia de imagen no impide guardar ni exportar el contenido textual.'

# EP09 — Radar | M6
create_issue "US-029 — Obtener tendencias desde fuentes externas actuales" "EP09" "Radar" "epic:radar" "M6 — 🌊 En la ola" "P2" "persona creadora" "consultar tendencias desde fuentes externas actuales" "encontrar puntos de partida para contenido" $'- El Radar consulta fuentes externas configuradas.\n- Cada tendencia conserva la fuente y fecha de consulta cuando estén disponibles.\n- Los errores de fuente se muestran sin detener el resto de MAREA.\n- El resultado distingue datos de tendencia de contenido generado.'
create_issue "US-030 — Filtrar tendencias según nicho, perfil y competencias" "EP09" "Radar" "epic:radar" "M6 — 🌊 En la ola" "P2" "persona creadora" "filtrar tendencias con mi nicho y perfil" "priorizar oportunidades relevantes para mis competencias reales y audiencia" $'- El Radar permite seleccionar un perfil y uno de sus nichos o subnichos.\n- El filtrado considera conocimientos y competencias reales del perfil.\n- El filtrado considera nicho, subnicho, audiencia, objetivos y temas a evitar cuando existan.\n- No recomienda contenido que requiera aparentar conocimientos o experiencia inexistentes.\n- Se indica qué perfil y nicho se utilizaron para el resultado.'
create_issue "US-031 — Convertir tendencias en propuestas originales de contenido" "EP09" "Radar" "epic:radar" "M6 — 🌊 En la ola" "P2" "persona creadora" "convertir una tendencia en una propuesta original" "inspirarme sin copiar publicaciones de terceros" $'- La tendencia se usa como contexto, no como texto a parafrasear.\n- La propuesta incorpora el perfil, nicho o subnicho y plataforma seleccionados.\n- La propuesta es compatible con las competencias reales y audiencia del perfil.\n- El resultado identifica la tendencia o fuente que lo inspiró.\n- La propuesta entra en el mismo flujo de revisión humana que una idea propia.'

# EP10 — Idiomas | M7
create_issue "US-032 — Generar contenido en ES/EN/FR/IT" "EP10" "Internacionalización" "epic:i18n" "M7 — 🔬 MAREA sabe investigar" "P2" "persona creadora" "elegir el idioma de generación" "comunicarme con audiencias en castellano, inglés, francés e italiano" $'- El formulario permite castellano, inglés, francés e italiano.\n- El idioma seleccionado se incorpora a la generación.\n- El resultado guarda el idioma usado.\n- Cada pieza multicanal puede generarse con el idioma seleccionado.'

# EP11 — RAG científico | M7
create_issue "US-033 — Construir RAG científico con arXiv y Chroma" "EP11" "RAG científico" "epic:rag" "M7 — 🔬 MAREA sabe investigar" "P2" "desarrolladora" "construir un flujo RAG científico" "recuperar contexto de arXiv para divulgación de IA y ML" $'- El flujo obtiene documentos de arXiv.\n- Los documentos se procesan y dividen en chunks.\n- Los embeddings se almacenan en Chroma.\n- Un retriever recupera chunks relevantes para la consulta.\n- El alcance inicial se centra en IA y machine learning.'
create_issue "US-034 — Generar divulgación científica con fuentes trazables" "EP11" "RAG científico" "epic:rag" "M7 — 🔬 MAREA sabe investigar" "P2" "persona creadora" "generar divulgación científica apoyada en fuentes" "explicar temas de IA y ML con respaldo identificable" $'- El modo científico usa contexto recuperado por el RAG.\n- La salida incluye las fuentes de arXiv utilizadas.\n- Las fuentes se conservan con la generación.\n- El contenido pasa por revisión humana antes de copiarse o descargarse.'

# EP12 / EP13 — Finanzas y observabilidad | M7
create_issue "US-035 — Generar contenido financiero con información actualizada" "EP12" "Finanzas" "epic:finance" "M7 — 🔬 MAREA sabe investigar" "P2" "persona creadora" "usar información financiera externa actualizada" "generar contenido con contexto de mercado vigente" $'- La información procede de una fuente o API externa configurada.\n- Se conserva la fuente y fecha de consulta disponibles.\n- El LLM recibe los datos obtenidos como contexto diferenciado.\n- Un fallo de la fuente evita presentar datos desactualizados como actuales.'
create_issue "US-036 — Registrar trazabilidad de generaciones y fuentes" "EP13" "Observabilidad" "epic:observability" "M7 — 🔬 MAREA sabe investigar" "P2" "desarrolladora" "registrar trazabilidad de cada generación" "auditar resultados, fuentes y errores" $'- Se registra timestamp, proveedor, modelo y tipo de generación.\n- Se registran configuración, plataforma, duración y resultado.\n- Se registran fuentes y errores cuando correspondan.\n- La información puede consultarse junto a la generación.'

# EP17 — Entrega | M8
create_issue "US-037 — Dockerizar y validar la ejecución completa de MAREA" "EP17" "Entrega" "epic:delivery" "M8 — 🚀 MAREA lista para navegar" "P1" "desarrolladora" "dockerizar y validar el flujo completo" "facilitar una ejecución reproducible de MAREA" $'- Docker Compose define los servicios necesarios para el flujo implementado.\n- La configuración sensible se proporciona por entorno y no se integra en la imagen.\n- La documentación explica cómo iniciar el entorno.\n- Se valida el flujo disponible de extremo a extremo en el entorno documentado.'

# EP14 / EP15 — Calidad y agentes | M8
create_issue "US-038 — Incorporar evaluación y guardrails" "EP14" "Calidad" "epic:quality" "M8 — 🚀 MAREA lista para navegar" "P3" "desarrolladora" "incorporar evaluación y guardrails" "reducir resultados inadecuados y mejorar la calidad" $'- Se definen criterios evaluables para la salida generada.\n- Los guardrails se aplican antes de presentar la salida como propuesta.\n- Un resultado señalado queda identificado para revisión humana.\n- La evaluación y sus incidencias son trazables.'
create_issue "US-039 — Implementar arquitectura multiagente" "EP15" "Agentes" "epic:agents" "M8 — 🚀 MAREA lista para navegar" "P3" "desarrolladora" "implementar una arquitectura multiagente" "especializar tareas y enrutar solicitudes complejas" $'- Se define un router de tareas.\n- Los agentes especializados tienen responsabilidades delimitadas.\n- El flujo conserva trazabilidad de la intervención de agentes.\n- La arquitectura no sustituye la revisión humana previa a cualquier publicación.'

# EP18 — Portfolio | M8
create_issue "US-040 — Preparar README y presentación de portfolio" "EP18" "Portfolio" "epic:portfolio" "M8 — 🚀 MAREA lista para navegar" "P1" "autora del proyecto" "preparar el README y la presentación de portfolio" "comunicar con claridad el valor, alcance y arquitectura de MAREA" $'- El README identifica el producto, tagline, problema y solución propuesta.\n- Documenta arquitectura, stack, roadmap y estado real de implementación.\n- La presentación técnica explica decisiones y flujo funcional.\n- Ambos materiales reflejan MAREA como producto y portfolio con su contexto académico.'
create_issue "US-041 — Redactar y publicar el artículo de MAREA en Medium" "EP18" "Portfolio" "epic:portfolio" "M8 — 🚀 MAREA lista para navegar" "P0" "autora del proyecto" "redactar y publicar un artículo sobre MAREA en Medium" "compartir el proceso y resultado del proyecto" $'- El artículo explica el problema y la propuesta de valor.\n- Describe decisiones técnicas relevantes sin exponer secretos.\n- Incluye el estado real y los límites del proyecto.\n- El artículo se publica en Medium.'
create_issue "US-042 — Preparar y validar demo y presentación técnica final" "EP18" "Portfolio" "epic:portfolio" "M8 — 🚀 MAREA lista para navegar" "P0" "autora del proyecto" "preparar y validar la demo y presentación técnica final" "mostrar el flujo de MAREA de forma fiable" $'- La demo cubre el flujo disponible desde idea hasta revisión y salida.\n- La demo muestra contenido diferenciado por plataforma cuando esa capacidad esté implementada.\n- La presentación incluye arquitectura, stack, decisiones y trazabilidad.\n- Se verifica la demo en el entorno previsto antes de la entrega.'

echo "Resumen: creadas $created Issues; omitidas $skipped Issues."
