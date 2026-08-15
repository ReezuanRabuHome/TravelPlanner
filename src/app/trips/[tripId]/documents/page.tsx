import { notFound } from 'next/navigation'

import { UploadZone } from '@/components/upload-zone'
import { addExpectedDocumentForm, clearDocumentFile, deleteDocument } from '@/lib/actions'
import { fileFormat, fileSize, shortDate } from '@/lib/format'
import { getTripBundle } from '@/lib/load'

export default async function DocumentsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params
  const bundle = await getTripBundle(tripId)
  if (!bundle) notFound()

  const { documents, bookings, days } = bundle

  const clippedTo = (doc: (typeof documents)[number]) => {
    const booking = bookings.find((b) => b.id === doc.booking_id)
    if (booking) return booking.title
    const day = days.find((d) => d.id === doc.day_id)
    if (day) return `Day ${day.day_number} · ${shortDate(day.date)}`
    return 'Trip-wide'
  }

  const uploaded = documents.filter((d) => d.storage_path)
  const missing = documents.filter((d) => !d.storage_path)

  return (
    <>
      <div className="viewhead">
        <div>
          <h1>Documents</h1>
          <p className="sub">
            Every file, what it is clipped to, and the day you actually need it.
          </p>
        </div>
        <span className="badge ok">
          {uploaded.length} of {documents.length} uploaded
        </span>
      </div>

      {missing.length > 0 && (
        <>
          <p className="sechead">Still needed</p>
          <div className="cardrow">
            {missing.map((doc) => (
              <div className="bcard" key={doc.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span className="kind">{clippedTo(doc)}</span>
                  <span className="badge warn">Missing</span>
                </div>
                <h3 style={{ fontSize: 16 }}>{doc.label}</h3>
                <p>Needed {doc.needed_on ? shortDate(doc.needed_on) : 'every day of the trip'}</p>
                <UploadZone
                  tripId={tripId}
                  documentId={doc.id}
                  label={doc.label}
                  title={`Upload ${doc.label}`}
                  hint="PDF, photo or screenshot"
                />
                <form action={deleteDocument.bind(null, doc.id, tripId)} style={{ marginTop: 8 }}>
                  <button
                    className="linkbtn"
                    type="submit"
                    style={{ fontSize: 12.5, color: 'var(--muted)' }}
                  >
                    Not needed after all — remove from the list
                  </button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="sechead">On file</p>
      {uploaded.length === 0 ? (
        <div className="emptyday">
          <strong>Nothing uploaded yet</strong>
          <span>Upload one of the documents above, or add a new file below.</span>
        </div>
      ) : (
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Clipped to</th>
                <th>Needed on</th>
                <th>Size</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {uploaded.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <span className="fmt">{fileFormat(doc)}</span> {doc.file_name}
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{doc.label}</div>
                  </td>
                  <td>{clippedTo(doc)}</td>
                  <td>{doc.needed_on ? shortDate(doc.needed_on) : 'Every day'}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                    {fileSize(doc.size_bytes)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <a
                        className="linkbtn"
                        href={`/api/doc/${doc.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                      <a className="linkbtn" href={`/api/doc/${doc.id}?download=1`}>
                        Download
                      </a>
                      <form action={clearDocumentFile.bind(null, doc.id, tripId)}>
                        <button className="linkbtn" type="submit" style={{ color: 'var(--muted)' }}>
                          Replace
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="daygrid" style={{ marginTop: 24 }}>
        <div className="panel">
          <h3>Upload something new</h3>
          <div className="inner">
            <UploadZone
              tripId={tripId}
              title="Drop a file here"
              hint="Goes in as a trip-wide document you can re-clip later"
            />
          </div>
        </div>

        <div className="panel">
          <h3>Note a document you still need</h3>
          <div className="inner">
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--muted)' }}>
              Adds it to the list as missing, so the Overview keeps reminding you.
            </p>
            <form action={addExpectedDocumentForm.bind(null, tripId)}>
              <div className="inlineform">
                <input
                  name="label"
                  placeholder="e.g. Vaccination certificate"
                  required
                  aria-label="Document name"
                />
              </div>
              <div className="inlineform">
                <input name="needed_on" type="date" aria-label="Needed on" />
                <button className="btn sec" type="submit">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
