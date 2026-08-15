'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { registerDocument } from '@/lib/actions'
import { createClient } from '@/lib/supabase/client'

const MAX_BYTES = 25 * 1024 * 1024

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]+/g, '-').slice(-120)
}

/**
 * Uploads straight from the browser into the private bucket, then records the
 * metadata. The file never passes through the Next.js server, so a 20 MB scan
 * does not have to fit in a serverless function's request body.
 */
export function UploadZone({
  tripId,
  documentId,
  dayId = null,
  bookingId = null,
  label,
  neededOn = null,
  title = 'Drop a file here',
  hint = 'It gets clipped to this day automatically',
}: {
  tripId: string
  documentId?: string
  dayId?: string | null
  bookingId?: string | null
  label?: string
  neededOn?: string | null
  title?: string
  hint?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function upload(file: File) {
    setError(null)

    if (file.size > MAX_BYTES) {
      setError(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 25 MB.`)
      return
    }

    setBusy(true)
    try {
      const supabase = createClient()
      const path = `${tripId}/${crypto.randomUUID()}-${safeName(file.name)}`

      const { error: uploadError } = await supabase.storage
        .from('trip-documents')
        .upload(path, file, { contentType: file.type || 'application/octet-stream' })

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`)
        return
      }

      await registerDocument({
        tripId,
        documentId,
        dayId,
        bookingId,
        label: label ?? file.name,
        fileName: file.name,
        storagePath: path,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        neededOn,
      })

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong during the upload.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div>
      <button
        type="button"
        className="dropzone"
        data-over={over}
        data-busy={busy}
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) void upload(file)
        }}
      >
        <strong>{busy ? 'Uploading…' : title}</strong>
        <span>{busy ? 'Do not close the tab' : hint}</span>
      </button>

      <input
        ref={input}
        type="file"
        hidden
        accept="application/pdf,image/jpeg,image/png,image/heic,image/webp,.pkpass"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
        }}
      />

      {error && <p className="uploaderr">{error}</p>}
    </div>
  )
}
