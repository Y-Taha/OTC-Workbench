import { useEffect, useState } from 'react'
import { fileNameFromPath, filePathValue, fileViewUrl } from '../lib/storageFiles'

type StorageFileLinkProps = {
  fieldName: string
  value: unknown
  emptyLabel?: string
  label?: string
}

export default function StorageFileLink({ fieldName, value, emptyLabel = '-', label }: StorageFileLinkProps) {
  const path = filePathValue(value)
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    setUrl('')
    setError(null)

    if (!path) return

    fileViewUrl(fieldName, path)
      .then((nextUrl) => {
        if (!cancelled) setUrl(nextUrl)
      })
      .catch((fileError) => {
        if (!cancelled) setError(fileError instanceof Error ? fileError.message : 'Could not prepare file link.')
      })

    return () => {
      cancelled = true
    }
  }, [fieldName, path])

  if (!path) return <>{emptyLabel}</>
  if (error) return <span className="error">Could not load file link.</span>
  if (!url) return <span className="muted">Preparing file link...</span>

  return (
    <a className="file-view-link" href={url} target="_blank" rel="noreferrer">
      {label || fileNameFromPath(path)}
    </a>
  )
}
