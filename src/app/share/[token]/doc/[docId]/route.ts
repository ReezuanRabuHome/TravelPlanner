import { NextResponse, type NextRequest } from 'next/server'

import { resolveShareToken } from '@/lib/data'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Opens one document for a family member holding a valid share link.
 * The document must belong to the trip that token points at — otherwise a
 * guessed id from someone else's trip would leak through the service role.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; docId: string }> },
) {
  const { token, docId } = await params
  const download = request.nextUrl.searchParams.get('download') === '1'

  const admin = createAdminClient()
  const link = await resolveShareToken(admin, token)
  if (!link) {
    return NextResponse.json({ error: 'That link is no longer valid.' }, { status: 404 })
  }

  const { data: doc } = await admin
    .from('documents')
    .select('storage_path, file_name, trip_id')
    .eq('id', docId)
    .eq('trip_id', link.trip_id)
    .maybeSingle()

  if (!doc?.storage_path) {
    return NextResponse.json({ error: 'No file attached to that document.' }, { status: 404 })
  }

  const { data, error } = await admin.storage
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
