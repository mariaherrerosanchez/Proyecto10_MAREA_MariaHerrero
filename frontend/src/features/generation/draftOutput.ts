import type { Platform } from '../../generation/types'

type ClipboardPort = {
  writeText: (text: string) => Promise<void>
}

type DownloadAnchor = {
  download: string
  href: string
  click: () => void
  remove: () => void
}

export type DownloadEnvironment = {
  Blob: typeof Blob
  appendAnchor: (anchor: DownloadAnchor) => void
  createAnchor: () => DownloadAnchor
  createObjectUrl: (blob: Blob) => string
  revokeObjectUrl: (url: string) => void
}

export async function copyDraftText(text: string, clipboard: ClipboardPort | undefined = globalThis.navigator?.clipboard): Promise<void> {
  if (clipboard === undefined) {
    throw new Error('Clipboard API is not available.')
  }
  await clipboard.writeText(text)
}

export function createDraftFilename(platform: Platform, topic: string): string {
  const safeTopic = topic
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 72)

  return `marea-${platform}-${safeTopic || 'contenido'}.txt`
}

export function downloadDraftText(
  text: string,
  platform: Platform,
  topic: string,
  environment: DownloadEnvironment | undefined = browserDownloadEnvironment(),
): void {
  if (environment === undefined) {
    throw new Error('Download APIs are not available.')
  }

  const blob = new environment.Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = environment.createObjectUrl(blob)
  const anchor = environment.createAnchor()
  anchor.download = createDraftFilename(platform, topic)
  anchor.href = url

  try {
    environment.appendAnchor(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    environment.revokeObjectUrl(url)
  }
}

function browserDownloadEnvironment(): DownloadEnvironment | undefined {
  if (
    typeof document === 'undefined'
    || typeof Blob === 'undefined'
    || typeof URL.createObjectURL !== 'function'
    || typeof URL.revokeObjectURL !== 'function'
  ) {
    return undefined
  }

  return {
    Blob,
    appendAnchor: (anchor) => document.body.append(anchor as HTMLAnchorElement),
    createAnchor: () => document.createElement('a'),
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  }
}
