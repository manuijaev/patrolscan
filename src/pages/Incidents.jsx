import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  IconAlertCircle,
  IconClock,
  IconMapPin,
  IconUser,
  IconTrash,
  IconX,
  IconPhoto,
  IconDownload,
} from '@tabler/icons-react'
import { toast } from 'react-hot-toast'
import api from '../api/axios'
import { getToken } from '../auth/authStore'
import { createPortal } from 'react-dom'

export default function Incidents({ showHeading = true }) {
  const location = useLocation()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [previewImage, setPreviewImage] = useState(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewMeta, setPreviewMeta] = useState(null)
  const [highlightedIncidentId, setHighlightedIncidentId] = useState('')
  const portalTarget = typeof document !== 'undefined' ? document.body : null
  const [downloadingImageKey, setDownloadingImageKey] = useState('')

  useEffect(() => {
    let active = true

    async function loadIncidents() {
      try {
        const token = getToken()
        const res = await api.get('/incidents', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (active) {
          const data = Array.isArray(res.data) ? res.data : []
          setIncidents(data)
          window.dispatchEvent(new Event('incidents:changed'))
        }
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

  const closePreview = useCallback(() => {
    setPreviewImage(null)
    setPreviewTitle('')
    setPreviewMeta(null)
  }, [])

  function openPreview(src, incident, idx) {
    setPreviewImage(src)
    setPreviewTitle(`${incident.checkpointName || 'Incident'} · Photo ${idx + 1}`)
    setPreviewMeta({ incidentId: incident.id, idx })
  }

  useEffect(() => {
    if (!previewImage) return undefined

    const onKeyDown = e => {
      if (e.key === 'Escape') {
        closePreview()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [previewImage, closePreview])

  useEffect(() => {
    if (!incidents.length) return
    const params = new URLSearchParams(location.search)
    const incidentId = params.get('incidentId')
    if (!incidentId) return

    const target = incidents.find(incident => incident.id === incidentId)
    if (!target) return

    const element = document.getElementById(`incident-${incidentId}`)
    if (!element) return

    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedIncidentId(incidentId)
    const timer = setTimeout(() => setHighlightedIncidentId(''), 2600)
    return () => clearTimeout(timer)
  }, [incidents, location.search])

  useEffect(() => {
    if (!previewImage) return undefined
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [previewImage])

  const totalPhotos = useMemo(
    () => incidents.reduce((sum, incident) => sum + (Array.isArray(incident.images) ? incident.images.length : 0), 0),
    [incidents]
  )

  const previewDownloadIncidentId = previewMeta?.incidentId
  const previewDownloadIndex = Number.isFinite(previewMeta?.idx) ? previewMeta.idx : 0
  const previewPortal = previewImage && portalTarget
    ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6"
          onClick={closePreview}
        >
          <div
            className="relative z-10 w-full max-w-[min(95vw,980px)] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--panel)]/95 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--text-muted)]">
                {previewTitle || 'Incident photo'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDownloadImage(previewImage, previewDownloadIncidentId, previewDownloadIndex)
                  }}
                  className="flex items-center gap-2 rounded-full border border-black/20 bg-black/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-[color:var(--text)] transition hover:bg-black/15"
                >
                  <IconDownload size={14} />
                  Download
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--panel)] transition hover:bg-[color:var(--panel-strong)]"
                  aria-label="Close preview"
                >
                  <IconX size={16} />
                </button>
              </div>
            </div>
            <div className="relative max-h-[82vh] overflow-hidden rounded-b-2xl border border-[color:var(--border)] bg-black px-4 pb-4 pt-2 shadow-[0_12px_45px_rgba(0,0,0,0.5)]">
              <img
                src={previewImage}
                alt={previewTitle || 'Incident preview'}
                className="max-h-[78vh] w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>,
        portalTarget
      )
    : null

  function resolveImageFilename(src, fallbackName) {
    try {
      const parsed = new URL(src)
      const candidate = parsed.pathname.split('/').filter(Boolean).pop()
      if (candidate) {
        return decodeURIComponent(candidate)
      }
    } catch {
      // ignore and fall back
    }
    return fallbackName
  }

  async function handleDownloadImage(src, incidentId, idx) {
    const resolvedId = incidentId ?? 'preview'
    const safeIndex = Number.isFinite(idx) ? idx : 0
    const downloadKey = `${resolvedId}-${safeIndex}`
    const fallbackName = `incident-${resolvedId}-photo-${safeIndex + 1}.jpg`
    setDownloadingImageKey(downloadKey)
    try {
      const response = await fetch(src)
      if (!response.ok) {
        throw new Error('Unexpected response when downloading image')
      }
      const blob = await response.blob()
      const fileName = resolveImageFilename(src, fallbackName)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Image download started')
    } catch (err) {
      console.error('Failed to download incident image', err)
      toast.error('Failed to download image. Please try again.')
    } finally {
      setDownloadingImageKey(prev => (prev === downloadKey ? '' : prev))
    }
  }

  function formatDateTime(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }

  async function handleDeleteIncident(incidentId) {
    const confirmed = window.confirm('Delete this incident report permanently?')
    if (!confirmed) return

    try {
      setDeletingId(incidentId)
      const token = getToken()
      await api.delete(`/incidents/${incidentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setIncidents(prev => prev.filter(incident => incident.id !== incidentId))
      window.dispatchEvent(new Event('incidents:changed'))
      toast.success('Incident deleted')
    } catch (err) {
      console.error('Failed to delete incident', err)
      toast.error('Failed to delete incident. Please try again.')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="space-y-6">
        {showHeading && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Incident Reports</h2>
              <p className="text-sm text-[color:var(--text-muted)]">
                View incidents reported by guards, including photos and notes.
              </p>
            </div>
            <div className="inline-flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2 text-xs">
              <span className="font-semibold">{incidents.length}</span>
              <span className="text-[color:var(--text-muted)]">Reports</span>
              <span className="h-4 w-px bg-[color:var(--border)]" />
              <span className="font-semibold">{totalPhotos}</span>
              <span className="text-[color:var(--text-muted)]">Photos</span>
            </div>
          </div>
        )}

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
                id={`incident-${incident.id}`}
                className={`rounded-2xl border p-4 space-y-3 transition-all duration-300 hover:shadow-[var(--shadow)] hover:-translate-y-0.5 ${
                  highlightedIncidentId === incident.id
                    ? 'border-[color:var(--accent)] ring-2 ring-[color:var(--accent)]/35 bg-[color:var(--accent-soft)]'
                    : 'border-[color:var(--border)] bg-[color:var(--bg-muted)]'
                }`}
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
                  <button
                    type="button"
                    onClick={() => handleDeleteIncident(incident.id)}
                    disabled={deletingId === incident.id}
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                    aria-label="Delete incident"
                  >
                    <IconTrash size={16} className={deletingId === incident.id ? 'animate-pulse' : ''} />
                  </button>
                </div>

                <p className="text-sm text-[color:var(--text)] whitespace-pre-line">
                  {incident.comment}
                </p>

                {Array.isArray(incident.images) && incident.images.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[color:var(--text-muted)]">
                      Photos ({incident.images.length})
                    </p>
                    <div
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                        gridAutoRows: 'minmax(80px, 1fr)',
                      }}
                    >
                      {incident.images.map((src, idx) => {
                        const imageKey = `${incident.id ?? 'incident'}-${idx}`
                        const isDownloading = downloadingImageKey === imageKey
                        return (
                          <div
                            key={imageKey}
                            className="relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] shadow-[var(--shadow)] transition hover:border-[color:var(--accent)]"
                          >
                            <button
                              type="button"
                              onClick={() => openPreview(src, incident, idx)}
                              className="group relative block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                              aria-label={`Preview incident photo ${idx + 1}`}
                            >
                              <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
                                <img
                                  src={src}
                                  alt={`Incident ${incident.id} photo ${idx + 1}`}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                <div className="pointer-events-none absolute left-2 bottom-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white">
                                  <IconPhoto size={10} />
                                  Photo {idx + 1}
                                </div>
                              </div>
                            </button>
                            <button
                              type="button"
                              disabled={isDownloading}
                              onClick={(event) => {
                                event.stopPropagation()
                                handleDownloadImage(src, incident.id, idx)
                              }}
                              className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full border border-white/70 bg-black/60 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white transition hover:bg-black/80 disabled:cursor-wait disabled:opacity-70"
                              aria-label={`Download incident photo ${idx + 1}`}
                            >
                              <IconDownload size={14} className={isDownloading ? 'animate-spin' : ''} />
                              <span className="hidden sm:inline">Download</span>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {previewPortal}
    </div>
  )
}
