import { useState } from 'react'

interface ImportFormProps {
  onSubmit: (formData: FormData) => Promise<void>
  isUploading: boolean
  compact?: boolean
}

export function ImportForm({
  onSubmit,
  isUploading,
  compact = false,
}: ImportFormProps) {
  const [file, setFile] = useState<File | null>(null)

  return (
    <form
      className={compact ? 'upload-form compact' : 'upload-form'}
      onSubmit={async (event) => {
        event.preventDefault()
        if (!file) return

        const formData = new FormData()
        formData.set('file', file)
        formData.set('mode', 'statement')
        await onSubmit(formData)
        event.currentTarget.reset()
        setFile(null)
      }}
    >
      <label>
        <span>Upload file</span>
        <input
          type="file"
          accept=".csv,.pdf"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <button type="submit" data-variant="primary" disabled={!file || isUploading}>
        {isUploading ? 'Uploading…' : compact ? 'Start import' : 'Create import batch'}
      </button>
    </form>
  )
}
