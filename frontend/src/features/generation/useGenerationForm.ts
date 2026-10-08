import { useReducer, useState } from 'react'

import type { GenerationFormValues, Platform } from '../../generation/types'
import { createApiClient } from '../../services/api'
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

const fallbackError = 'No se ha podido generar el borrador. Inténtalo de nuevo.'

export function useGenerationForm() {
  const [values, setValues] = useState<GenerationFormValues>(initialFormValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [generation, dispatch] = useReducer(generationReducer, initialGenerationState)

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

  async function submit() {
    if (generation.status === 'loading') {
      return
    }

    const nextErrors = validateGenerationForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    dispatch({ type: 'start' })
    try {
      const result = await createApiClient().generateMultichannelContent(
        serializeMultichannelGenerationRequest(values),
      )
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
    submit,
  }
}
