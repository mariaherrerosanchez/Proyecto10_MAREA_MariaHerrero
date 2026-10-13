import { describe, expect, it } from 'vitest'

import type { StockImage } from '../../images/types'
import {
  MAX_UPLOADED_IMAGE_BYTES,
  clearStockImage,
  createUploadedImage,
  selectStockImage,
  selectUploadedImage,
  suggestedImageQuery,
  validateUploadedImage,
} from './stockImageState'

const coastImage: StockImage = {
  identifier: '42',
  thumbnail_url: 'https://images.pexels.com/photos/42/thumbnail.jpeg',
  display_url: 'https://images.pexels.com/photos/42/display.jpeg',
  author_name: 'Ada Fotógrafa',
  original_url: 'https://www.pexels.com/photo/42/',
  provider: 'pexels',
}

describe('stock image session state', () => {
  it('builds an editable initial query from topic and niches without draft text', () => {
    expect(suggestedImageQuery(' IA aplicada a QA ', ['Tecnología', ' QA / Testing ']))
      .toBe('IA aplicada a QA Tecnología QA / Testing')
  })

  it('keeps selected images independent per platform and clears only the changed piece', () => {
    const selected = selectStockImage(
      selectStockImage({}, 'linkedin', coastImage),
      'instagram',
      { ...coastImage, identifier: '43' },
    )

    expect(clearStockImage(selected, 'linkedin')).toEqual({
      instagram: { kind: 'stock', image: { ...coastImage, identifier: '43' } },
    })
  })

  it('keeps an uploaded image independent from a stock selection on another platform', () => {
    const uploaded = createUploadedImage(
      { name: 'mi-foto.webp', size: 100, lastModified: 42 },
      'data:image/webp;base64,example',
    )
    const selected = selectUploadedImage(selectStockImage({}, 'linkedin', coastImage), 'instagram', uploaded)

    expect(selected.instagram).toEqual(uploaded)
    expect(clearStockImage(selected, 'instagram')).toEqual({
      linkedin: { kind: 'stock', image: coastImage },
    })
  })

  it('accepts only bounded PNG, JPG and WebP uploads', () => {
    expect(validateUploadedImage({ type: 'image/jpeg', size: MAX_UPLOADED_IMAGE_BYTES })).toBeUndefined()
    expect(validateUploadedImage({ type: 'image/gif', size: 100 })).toBe('Selecciona una imagen PNG, JPG o WebP.')
    expect(validateUploadedImage({ type: 'image/webp', size: 0 })).toBe('La imagen seleccionada está vacía.')
    expect(validateUploadedImage({ type: 'image/png', size: MAX_UPLOADED_IMAGE_BYTES + 1 }))
      .toBe('La imagen no puede superar 5 MB.')
  })
})
