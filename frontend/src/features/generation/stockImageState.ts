import type { Platform } from '../../generation/types'
import type { StockImage } from '../../images/types'

export const MAX_UPLOADED_IMAGE_BYTES = 5 * 1024 * 1024

type UploadCandidate = Pick<File, 'size' | 'type'>

export type UploadedImage = {
  fileName: string
  identifier: string
  kind: 'uploaded'
  previewUrl: string
}

export type SelectedContentImage =
  | { image: StockImage; kind: 'stock' }
  | UploadedImage

export type SelectedStockImages = Partial<Record<Platform, SelectedContentImage>>

export function suggestedImageQuery(topic: string, niches: string[]): string {
  return [topic.trim(), ...niches.map((niche) => niche.trim()).filter(Boolean)]
    .filter(Boolean)
    .join(' ')
    .slice(0, 120)
}

export function selectStockImage(
  state: SelectedStockImages,
  platform: Platform,
  image: StockImage,
): SelectedStockImages {
  return { ...state, [platform]: { kind: 'stock', image } }
}

export function selectUploadedImage(
  state: SelectedStockImages,
  platform: Platform,
  image: UploadedImage,
): SelectedStockImages {
  return { ...state, [platform]: image }
}

export function clearStockImage(
  state: SelectedStockImages,
  platform: Platform,
): SelectedStockImages {
  const next = { ...state }
  delete next[platform]
  return next
}

export function validateUploadedImage(file: UploadCandidate): string | undefined {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Selecciona una imagen PNG, JPG o WebP.'
  }
  if (file.size === 0) {
    return 'La imagen seleccionada está vacía.'
  }
  if (file.size > MAX_UPLOADED_IMAGE_BYTES) {
    return 'La imagen no puede superar 5 MB.'
  }
  return undefined
}

export function createUploadedImage(
  file: Pick<File, 'lastModified' | 'name' | 'size'>,
  previewUrl: string,
): UploadedImage {
  return {
    fileName: file.name,
    identifier: `upload-${file.name}-${file.size}-${file.lastModified}`,
    kind: 'uploaded',
    previewUrl,
  }
}
