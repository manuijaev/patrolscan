import { useEffect, useState } from 'react'
import {
  IconAlertCircle,
  IconClock,
  IconMapPin,
  IconUser,
} from '@tabler/icons-react'
import api from '../api/axios'
import { getToken } from '../auth/authStore'

export default function Incidents() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadIncidents() {
      try {
        const token = getToken()
        const res = await api.get('/incidents', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (active) setIncidents(res.data || [])
      } catch (err) {
        console.error('Failed to load incidents', err)
        if (active) {
          setError('Failed to load incidents. Please try again.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadIncidents()
    return () => {
      active = false
    }
  }, [])

  function formatDateTime(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Incident Reports</h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            View incidents reported by guards, including photos and notes.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 shadow-[var(--shadow)]">
        {loading ? (
          <p className="text-sm text-[color:var(--text-muted)]">Loading incidents…</p>
        ) : incidents.length === 0 ? (
          <div className="text-center py-10 text-[color:var(--text-muted)]">
            <IconAlertCircle size={40} className="mx-auto mb-3 opacity-60" />
            <p className="font-medium">No incidents reported yet.</p>
            <p className="text-sm mt-1">
              When guards submit incident reports, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map(incident => (
              <div
                key={incident.id}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-muted)] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[color:var(--accent-soft)] flex items-center justify-center">
                      <IconAlertCircle size={18} className="text-[color:var(--accent)]" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {incident.checkpointName || 'Unknown Checkpoint'}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)] mt-1">
                        <span className="flex items-center gap-1">
                          <IconUser size={14} />
                          {incident.guardName || 'Unknown Guard'}
                        </span>
                        <span className="flex items-center gap-1">
                          <IconClock size={14} />
                          {formatDateTime(incident.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[color:var(--text)] whitespace-pre-line">
                  {incident.comment}
                </p>

                {Array.isArray(incident.images) && incident.images.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[color:var(--text-muted)]">
                      Photos ({incident.images.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {incident.images.map((src, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="group relative rounded-xl overflow-hidden border border-[color:var(--border)] bg-[color:var(--panel)]"
                          onClick={() => {
                            const w = window.open()
                            if (w) {
                              w.document.write(
                                `<img src="${src}" style="max-width:100%;height:auto;display:block;margin:auto;" />`
                              )
                            }
                          }}
                        >
                          <img
                            src={src}
                            alt={`Incident ${incident.id} photo ${idx + 1}`}
                            className="h-32 w-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

