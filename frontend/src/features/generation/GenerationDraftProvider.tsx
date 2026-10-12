import { useCallback, useMemo, useState, type ReactNode } from 'react'

import type { GenerationFormValues } from '../../generation/types'
import {
  createDraftSnapshot,
  emptyGenerationDraft,
  GenerationDraftContext,
  sameDraft,
} from './GenerationDraftContext'

export function GenerationDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setStoredDraft] = useState<GenerationFormValues>(emptyGenerationDraft)

  const setDraft = useCallback((nextDraft: GenerationFormValues) => {
    const snapshot = createDraftSnapshot(nextDraft)
    setStoredDraft((currentDraft) => (
      sameDraft(currentDraft, snapshot) ? currentDraft : snapshot
    ))
  }, [])

  const value = useMemo(() => ({ draft, setDraft }), [draft, setDraft])

  return (
    <GenerationDraftContext.Provider value={value}>
      {children}
    </GenerationDraftContext.Provider>
  )
}
