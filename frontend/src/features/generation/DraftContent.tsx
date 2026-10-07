import type { ReactNode } from 'react'

import { parseDraftBlocks } from './draftPresentation'

type DraftContentProps = {
  text: string
}

export function DraftContent({ text }: DraftContentProps) {
  return (
    <div className="generation-draft__text">
      {parseDraftBlocks(text).map((block, index) => {
        if (block.type === 'heading') {
          return <h3 className="generation-draft__heading" key={`${block.type}-${index}`}>{renderInlineMarkdown(block.text)}</h3>
        }
        if (block.type === 'list') {
          return <ul className="generation-draft__list" key={`${block.type}-${index}`}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineMarkdown(item)}</li>)}</ul>
        }
        return <p className="generation-draft__paragraph" key={`${block.type}-${index}`}>{renderInlineMarkdown(block.text)}</p>
      })}
    </div>
  )
}

function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}
