import { useState } from 'react'

import type { StockImage, StockImageSearchResponse } from '../../images/types'
import { createApiClient, ImageSearchRequestError } from '../../services/api'
import {
  createUploadedImage,
  type SelectedContentImage,
  type UploadedImage,
  validateUploadedImage,
} from './stockImageState'

type ImageSearchPanelProps = {
  onSelect: (image: StockImage) => void
  onSelectUpload: (image: UploadedImage) => void
  onRemoveImage: () => void
  query: string
  onQueryChange: (value: string) => void
  selectedImage: SelectedContentImage | undefined
}

type SearchState =
  | { status: 'idle'; items: StockImage[] }
  | { status: 'loading'; items: StockImage[] }
  | { status: 'success'; items: StockImage[]; provider: StockImageSearchResponse['provider'] }
  | { status: 'error'; items: StockImage[]; message: string }

export function ImageSearchPanel({
  onSelect,
  onSelectUpload,
  onRemoveImage,
  onQueryChange,
  query,
  selectedImage,
}: ImageSearchPanelProps) {
  const [search, setSearch] = useState<SearchState>({ status: 'idle', items: [] })
  const [uploadError, setUploadError] = useState<string | undefined>()

  async function searchImages() {
    setSearch((current) => ({ status: 'loading', items: current.items }))
    try {
      const response = await createApiClient().searchStockImages(query)
      setSearch({ status: 'success', items: response.items, provider: response.provider })
    } catch (error) {
      setSearch({
        status: 'error',
        items: [],
        message: error instanceof ImageSearchRequestError
          ? error.message
          : 'No se han podido buscar imágenes ahora. Inténtalo de nuevo.',
      })
    }
  }

  async function uploadImage(file: File | undefined) {
    if (!file) {
      return
    }
    const validationError = validateUploadedImage(file)
    if (validationError) {
      setUploadError(validationError)
      return
    }
    try {
      const previewUrl = await readFileAsDataUrl(file)
      onSelectUpload(createUploadedImage(file, previewUrl))
      setUploadError(undefined)
    } catch {
      setUploadError('No se ha podido preparar la vista previa. Inténtalo de nuevo.')
    }
  }

  const selectedStockIdentifier = selectedImage?.kind === 'stock' ? selectedImage.image.identifier : undefined

  return (
    <section className="image-search" aria-labelledby="image-search-heading">
      <div className="image-search__heading">
        <div>
          <p className="eyebrow">Acompañamiento visual</p>
          <h3 id="image-search-heading">Busca una fotografía</h3>
        </div>
        <p>La consulta se envía al proveedor configurado al buscar. No enviamos el borrador.</p>
      </div>
      <label className="form-field" htmlFor="image-search-query">
        <span>Consulta de imagen</span>
        <input
          id="image-search-query"
          onChange={(event) => onQueryChange(event.target.value)}
          value={query}
        />
      </label>
      <button
        className="generation-draft__action"
        disabled={search.status === 'loading' || !query.trim()}
        onClick={() => void searchImages()}
        type="button"
      >
        {search.status === 'loading' ? 'Buscando imágenes…' : 'Buscar imagen'}
      </button>
      <div className="image-search__upload">
        <label className="generation-draft__action image-search__upload-button">
          <input
            accept="image/jpeg,image/png,image/webp"
            className="image-search__upload-input"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              void uploadImage(file)
            }}
            type="file"
          />
          {selectedImage ? 'Sustituir imagen' : 'Subir imagen'}
        </label>
        <p>PNG, JPG o WebP · máximo 5 MB · solo durante esta sesión.</p>
      </div>
      {selectedImage ? (
        <figure className="selected-stock-image">
          <img
            alt="Fotografía seleccionada para esta pieza"
            src={selectedImage.kind === 'stock' ? selectedImage.image.display_url : selectedImage.previewUrl}
          />
          <figcaption>
            {selectedImage.kind === 'stock' ? (
              <>Fotografía seleccionada de {selectedImage.image.author_name} en <a href={selectedImage.image.original_url} rel="noreferrer" target="_blank">Pexels</a>.</>
            ) : <>Imagen subida: {selectedImage.fileName}.</>}{' '}
            Solo disponible durante esta sesión.
            <button className="selected-stock-image__remove" onClick={onRemoveImage} type="button">Quitar imagen</button>
          </figcaption>
        </figure>
      ) : null}
      {uploadError ? <p className="generation-feedback generation-feedback--error" role="alert">{uploadError}</p> : null}
      {search.status === 'error' ? <p className="generation-feedback generation-feedback--error" role="alert">{search.message}</p> : null}
      {search.status === 'success' && search.provider === 'demo' ? (
        <p className="image-search__demo-notice" role="status">
          Modo demo: son fotografías de ejemplo; no corresponden a una búsqueda real.
        </p>
      ) : null}
      {search.status === 'success' && search.items.length === 0 ? <p role="status">No hemos encontrado fotografías para esta consulta.</p> : null}
      {search.items.length > 0 ? (
        <ul className="image-search__results" aria-label={search.status === 'success' && search.provider === 'demo' ? 'Resultados del modo demo' : 'Resultados de Pexels'}>
          {search.items.map((image) => (
            <li key={image.identifier}>
              <button
                aria-pressed={selectedStockIdentifier === image.identifier}
                className="image-search__result"
                onClick={() => onSelect(image)}
                type="button"
              >
                <img alt="" src={image.thumbnail_url} />
                <span>Foto de {image.author_name}</span>
              </button>
              <a href={image.original_url} rel="noreferrer" target="_blank">Ver original en Pexels</a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid image preview.'))
    reader.readAsDataURL(file)
  })
}
