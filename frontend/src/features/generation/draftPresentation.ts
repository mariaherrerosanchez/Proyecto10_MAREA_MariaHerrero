import type { GuardrailAssessment } from '../../generation/types'

export type DraftBlock =
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; text: string }

const escapedMarkdownArtifacts = /\\\*\\\*/g
const escapedBlockMarker = /^(\s*)\\([#-])(?=\s)/gm
const encodedSpace = /&#(?:x20|32);/gi

/**
 * Repairs only the transport artifacts observed in generated drafts. It deliberately
 * does not parse HTML or decode arbitrary entities, so model text remains safe React text.
 */
export function normalizeDraftText(text: string): string {
  return text
    .replace(escapedMarkdownArtifacts, '**')
    .replace(escapedBlockMarker, '$1$2')
    .replace(encodedSpace, ' ')
}

export function parseDraftBlocks(text: string): DraftBlock[] {
  const blocks: DraftBlock[] = []
  const lines = normalizeDraftText(text).split(/\r?\n/)
  let paragraphLines: string[] = []

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphLines.join('\n') })
      paragraphLines = []
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    const listItem = /^-\s+(.+)$/.exec(line)

    if (!line.trim()) {
      flushParagraph()
      continue
    }

    if (heading) {
      flushParagraph()
      blocks.push({ type: 'heading', text: heading[2] })
      continue
    }

    if (listItem) {
      flushParagraph()
      const items = [listItem[1]]
      while (index + 1 < lines.length) {
        const nextItem = /^-\s+(.+)$/.exec(lines[index + 1])
        if (!nextItem) {
          break
        }
        items.push(nextItem[1])
        index += 1
      }
      blocks.push({ type: 'list', items })
      continue
    }

    paragraphLines.push(line)
  }

  flushParagraph()
  return blocks
}

export function processingLocationLabel(location: unknown): string {
  if (location === 'local') {
    return 'LOCAL'
  }
  if (location === 'external') {
    return 'EXTERNO'
  }
  return 'NO DISPONIBLE'
}

export function reviewMessage(guardrails: GuardrailAssessment | null | undefined): string | null {
  if (!guardrails?.review_required) {
    return null
  }
  return 'Los controles de MAREA han señalado posibles afirmaciones que requieren una revisión adicional antes de utilizar este borrador.'
}
