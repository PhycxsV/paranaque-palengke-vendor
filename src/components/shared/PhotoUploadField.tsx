import { useEffect, useId, useState, type ChangeEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/shared/Notice'
import { ProductImage } from '@/components/shared/ProductImage'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

/** Returns an error message for a file the API would reject, or null. */
export function validatePhotoFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Upload a PNG, JPEG, or WebP photo.'
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return 'The photo must be between 1 byte and 5 MB.'
  }
  return null
}

/**
 * Photo for a product or commodity. Users can upload a photo from their device
 * (sent to the API when the form is saved) or paste an image link, and are
 * reminded to use appropriate photos.
 */
export function PhotoUploadField({
  subject,
  file,
  onFileChange,
  imageUrl,
  onImageUrlChange,
  allowLink = true,
  disabled,
}: {
  /** What the photo shows, e.g. "product" or "commodity". */
  subject: string
  file: File | null
  onFileChange: (file: File | null) => void
  imageUrl: string
  onImageUrlChange: (value: string) => void
  /** Show the "paste an image link" input (default true). */
  allowLink?: boolean
  disabled?: boolean
}) {
  const fileInputId = useId()
  const urlInputId = useId()
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setFilePreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!selected) return
    const problem = validatePhotoFile(selected)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    onFileChange(selected)
  }

  const previewSrc = filePreview ?? (imageUrl.trim() || null)

  return (
    <div className="space-y-3">
      <Notice tone="warning" title="Upload appropriate photos only">
        Make sure your {subject} photo clearly shows the actual item and is
        appropriate for all customers. Photos that are offensive, misleading, or
        unrelated to the {subject} may be removed.
      </Notice>

      <div className="flex items-center gap-3">
        {previewSrc ? (
          filePreview ? (
            <img
              src={filePreview}
              alt={`Selected ${subject} photo`}
              className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-border"
            />
          ) : (
            <ProductImage
              src={previewSrc}
              alt="Preview"
              className="h-16 w-16 shrink-0 rounded-xl ring-1 ring-border"
            />
          )
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary-50/40 text-primary-deep">
            <ImagePlus className="h-6 w-6" />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => document.getElementById(fileInputId)?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {file ? 'Choose another photo' : 'Upload photo'}
            </Button>
            {file ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  setError(null)
                  onFileChange(null)
                }}
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted">
            {file
              ? `${file.name} — uploads when you save`
              : 'PNG, JPEG, or WebP up to 5 MB'}
          </p>
        </div>
      </div>

      <input
        id={fileInputId}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        disabled={disabled}
        onChange={handleFileChange}
      />

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {file || !allowLink ? null : (
        <div className="grid gap-1.5">
          <Label htmlFor={urlInputId}>Or paste an image link</Label>
          <Input
            id={urlInputId}
            value={imageUrl}
            onChange={(e) => onImageUrlChange(e.target.value)}
            placeholder="https://..."
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
