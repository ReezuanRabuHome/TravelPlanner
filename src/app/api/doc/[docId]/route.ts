import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Hands out a short-lived signed URL for one document and redirects to it.
 * RLS does the access check: a document belonging to someone else's trip simply
 * is not selectable, so this returns 404 without a special case.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params
  const download = request.nextUrl.searchParams.get('download') === '1'

  const supabase = await createClient()
  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path, file_name')
    .eq('id', docId)
    .maybeSingle()

  if (!doc?.storage_path) {
    return NextResponse.json({ error: 'No file attached to that document.' }, { status: 404 })
  }

  const { data, error } = await supabase.storage
    .from('trip-documents')
    .createSignedUrl(
      doc.storage_path,
      300,
      download ? { download: doc.file_name ?? true } : undefined,
    )

  if (error || !data) {
    return NextResponse.json({ error: 'Could not open that file.' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
