import { describe, expect, it, vi } from 'vitest'

import { copyDraftText, createDraftFilename, downloadDraftText, type DownloadEnvironment } from './draftOutput'

describe('draft output', () => {
  it('copies the exact reviewed text through the Clipboard API', async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
    const text = 'Primera línea.\nSegunda línea con tilde y emoji 🌊'

    await copyDraftText(text, clipboard)

    expect(clipboard.writeText).toHaveBeenCalledWith(text)
  })

  it('reports unavailable Clipboard API through a recoverable rejection', async () => {
    await expect(copyDraftText('Texto', undefined)).rejects.toThrow('Clipboard API is not available.')
  })

  it('creates descriptive filenames without unsafe characters', () => {
    expect(createDraftFilename('instagram', 'IA, QA / Testing: guía práctica 🌊')).toBe(
      'marea-instagram-ia-qa-testing-guia-practica.txt',
    )
    expect(createDraftFilename('blog', '🌊')).toBe('marea-blog-contenido.txt')
  })

  it('downloads an UTF-8 text file without changing its text', async () => {
    let downloadedBlob: Blob | undefined
    const anchor = { download: '', href: '', click: vi.fn(), remove: vi.fn() }
    const environment: DownloadEnvironment = {
      Blob,
      appendAnchor: vi.fn(),
      createAnchor: () => anchor,
      createObjectUrl: (blob) => {
        downloadedBlob = blob
        return 'blob:marea-draft'
      },
      revokeObjectUrl: vi.fn(),
    }
    const text = 'Primera línea.\nSegunda línea con tilde y emoji 🌊'

    downloadDraftText(text, 'linkedin', 'IA aplicada', environment)

    expect(await downloadedBlob?.text()).toBe(text)
    expect(downloadedBlob?.type).toBe('text/plain;charset=utf-8')
    expect(anchor).toMatchObject({ href: 'blob:marea-draft', download: 'marea-linkedin-ia-aplicada.txt' })
    expect(anchor.click).toHaveBeenCalledOnce()
    expect(anchor.remove).toHaveBeenCalledOnce()
    expect(environment.revokeObjectUrl).toHaveBeenCalledWith('blob:marea-draft')
  })

  it('propagates a local download preparation failure', () => {
    const environment: DownloadEnvironment = {
      Blob,
      appendAnchor: vi.fn(),
      createAnchor: () => ({ download: '', href: '', click: vi.fn(), remove: vi.fn() }),
      createObjectUrl: () => { throw new Error('URL unavailable') },
      revokeObjectUrl: vi.fn(),
    }

    expect(() => downloadDraftText('Texto', 'blog', 'Tema', environment)).toThrow('URL unavailable')
  })
})
