# Evaluaciones locales de MAREA

`guardrail_cases.json` es un dataset sintético y versionado. Cada caso aporta un
contexto de generación, una salida controlada y comprobaciones deterministas de
fragmentos obligatorios, prohibidos o de instrucciones presentes en el prompt. No debe contener datos personales reales.

## Harness y tests

Los tests de `backend/tests/` validan software de forma determinista y no invocan
proveedores. El harness, en cambio, evalúa comportamiento de salidas: por defecto
usa las salidas sintéticas del dataset y tampoco hace llamadas de red.

Desde `backend/`:

```powershell
uv run python scripts/run_evaluations.py
```

Cada resultado incluye `case_id`, `prompt_version`, `provider`, `model`,
`platform`, `evaluator`, `status`, `reason` y `review_required`. `pass` no tiene
señales locales; `flag` necesita revisión humana; `fail` indica que no hay salida
evaluable. Ninguno sustituye la revisión humana.

El harness comprueba reglas de guardrails y expectativas sintéticas de fragmentos.
Puede comprobar que instrucciones editoriales concretas están presentes en el prompt construido,
pero no evalúa semánticamente el tono ni la calidad de adaptación por plataforma:
esos aspectos siguen requiriendo revisión humana.

Para evaluar con el proveedor configurado hay que activar explícitamente la red:

```powershell
uv run python scripts/run_evaluations.py --live
```

`--live` nunca forma parte de `pytest`, CI ni de las validaciones normales. Puede
enviar los prompts sintéticos del dataset al proveedor configurado.

La primera versión de los detectores usa señales conservadoras en español. Marca
posibles afirmaciones para revisión; no pretende demostrar que un hecho sea falso
ni reemplazar futuras fuentes verificadas de perfil.

## Añadir un caso

Añade un objeto con un `case_id` único, un `context` válido para
`GenerationContext`, una `candidate_output` sintética y, cuando corresponda,
`required_fragments` o `forbidden_fragments`. Mantén los casos pequeños,
anónimos y centrados en una única conducta comprobable.
