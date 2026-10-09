import { useCallback, useReducer, useRef, useState } from 'react'

import type {
  AvailableGenerationModel,
  GenerationFormValues,
  MultichannelGenerationRequest,
  Platform,
} from '../../generation/types'
import { createApiClient } from '../../services/api'
import {
  beginDraftEdit,
  createDraftReviewState,
  hasEditedDraft,
  hasEditedDrafts,
  markDraftReviewed,
  replaceDraft,
  updateDraftText,
  type DraftReviewState,
} from './draftReviewState'
import {
  generationReducer,
  addNiche,
  initialFormValues,
  initialGenerationState,
  serializeMultichannelGenerationRequest,
  selectAllPlatforms,
  removeNiche,
  toggleNiche,
  toggleSelectedPlatform,
  validateGenerationForm,
  type FormErrors,
} from './formState'
import {
  completePlatformRegeneration,
  createRegenerationRequest,
  failPlatformRegeneration,
  hasRegenerationInProgress,
  startPlatformRegeneration,
  type PlatformRegenerationState,
} from './regenerationState'

const fallbackError = 'No se ha podido generar el borrador. Inténtalo de nuevo.'

export function useGenerationForm() {
  const [values, setValues] = useState<GenerationFormValues>(initialFormValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [generation, dispatch] = useReducer(generationReducer, initialGenerationState)
  const [draftReviews, setDraftReviews] = useState<DraftReviewState>({})
  const [originalRequest, setOriginalRequest] = useState<MultichannelGenerationRequest | null>(null)
  const [regenerations, setRegenerations] = useState<PlatformRegenerationState>({})
  const [generationModels, setGenerationModels] = useState<AvailableGenerationModel[]>([])
  const [generationModelsError, setGenerationModelsError] = useState<string | null>(null)
  const regeneratingPlatforms = useRef(new Set<Platform>())

  function updateField<Field extends Exclude<keyof GenerationFormValues, 'niches' | 'selectedPlatforms' | 'activePlatform'>>(
    field: Field,
    value: GenerationFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function addSelectedNiche(niche: string) {
    setValues((current) => addNiche(current, niche))
  }

  function removeSelectedNiche(niche: string) {
    setValues((current) => removeNiche(current, niche))
  }

  function toggleSuggestedNiche(niche: string) {
    setValues((current) => toggleNiche(current, niche))
  }

  function togglePlatform(platform: Platform) {
    setValues((current) => toggleSelectedPlatform(current, platform))
  }

  function setActivePlatform(platform: Platform) {
    setValues((current) => current.selectedPlatforms.includes(platform)
      ? { ...current, activePlatform: platform }
      : current)
  }

  function selectAll() {
    setValues((current) => selectAllPlatforms(current))
  }

  const loadGenerationModels = useCallback(async () => {
    try {
      const models = await createApiClient().getGenerationModels()
      setGenerationModels(models)
      setGenerationModelsError(null)
      setValues((current) => models.some((model) => model.selection === current.modelSelection)
        ? current
        : { ...current, modelSelection: models[0]?.selection ?? 'primary' })
    } catch {
      setGenerationModelsError(
        'No se ha podido cargar la lista de modelos. Se usará el modelo predeterminado.',
      )
    }
  }, [])

  function beginEditingDraft(platform: Platform) {
    setDraftReviews((current) => beginDraftEdit(current, platform))
  }

  function updateDraft(platform: Platform, text: string) {
    setDraftReviews((current) => updateDraftText(current, platform, text))
  }

  function confirmDraftReview(platform: Platform) {
    setDraftReviews((current) => markDraftReviewed(current, platform))
  }

  async function regeneratePlatform(platform: Platform) {
    if (
      originalRequest === null
      || regeneratingPlatforms.current.has(platform)
      || generation.status === 'loading'
    ) {
      return
    }

    if (hasEditedDraft(draftReviews, platform) && !window.confirm(
      'Tienes cambios locales en esta pieza. Regenerarla sustituirá ese borrador. ¿Quieres continuar?',
    )) {
      return
    }

    regeneratingPlatforms.current.add(platform)
    setRegenerations((current) => startPlatformRegeneration(current, platform))
    try {
      const regenerated = await createApiClient().generateContent(
        createRegenerationRequest(originalRequest, platform),
      )
      setDraftReviews((current) => replaceDraft(current, platform, regenerated.text))
      dispatch({ type: 'replace-platform', platform, generation: regenerated })
      setRegenerations((current) => completePlatformRegeneration(current, platform))
    } catch (error) {
      setRegenerations((current) => failPlatformRegeneration(
        current,
        platform,
        error instanceof Error ? error.message : fallbackError,
      ))
    } finally {
      regeneratingPlatforms.current.delete(platform)
    }
  }

  async function submit() {
    if (generation.status === 'loading' || regeneratingPlatforms.current.size > 0 || hasRegenerationInProgress(regenerations)) {
      return
    }

    const nextErrors = validateGenerationForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    if (hasEditedDrafts(draftReviews) && !window.confirm(
      'Tienes ediciones locales sin guardar. Generar nuevos borradores sustituirá los resultados actuales. ¿Quieres continuar?',
    )) {
      return
    }

    setDraftReviews({})
    setRegenerations({})
    dispatch({ type: 'start' })
    try {
      const request = serializeMultichannelGenerationRequest(values)
      const result = await createApiClient().generateMultichannelContent(request)
      setDraftReviews(createDraftReviewState(result))
      setOriginalRequest(request)
      dispatch({ type: 'success', result })
    } catch (error) {
      dispatch({
        type: 'error',
        error: error instanceof Error ? error.message : fallbackError,
      })
    }
  }

  return {
    values,
    errors,
    generation,
    updateField,
    addSelectedNiche,
    removeSelectedNiche,
    toggleSuggestedNiche,
    togglePlatform,
    selectAll,
    setActivePlatform,
    draftReviews,
    beginEditingDraft,
    updateDraft,
    confirmDraftReview,
    regenerations,
    generationModels,
    generationModelsError,
    loadGenerationModels,
    regenerationInProgress: hasRegenerationInProgress(regenerations),
    regeneratePlatform,
    submit,
  }
}
