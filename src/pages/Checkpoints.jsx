import { useEffect, useState, useRef } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconX,
  IconCheck,
  IconMapPin,
  IconQrcode,
  IconDownload
} from '@tabler/icons-react'
import QRCode from 'qrcode'
import api from '../api/axios'
import { getToken } from '../auth/authStore'

export default function Checkpoints() {
  const [checkpoints, setCheckpoints] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Create form state
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')

  // QR code state
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const qrRef = useRef(null)

  async function loadCheckpoints() {
    try {
      const res = await api.get('/checkpoints', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      setCheckpoints(res.data)
    } catch (err) {
      console.error('Failed to load checkpoints', err)
      toast.error('Failed to load checkpoints')
    }
  }

  useEffect(() => {
    loadCheckpoints()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim() || !location.trim()) {
      toast.error('Name and location are required')
      return
    }

    setLoading(true)
    try {
      await api.post(
        '/checkpoints',
        { name: name.trim(), location: location.trim(), description: description.trim() },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      toast.success('Checkpoint created successfully')
      setName('')
      setLocation('')
      setDescription('')
      await loadCheckpoints()
    } catch (err) {
      console.error('Failed to create checkpoint', err)
      toast.error(err.response?.data?.error || 'Failed to create checkpoint')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(checkpoint) {
    setEditingId(checkpoint.id)
    setEditName(checkpoint.name)
    setEditLocation(checkpoint.location)
    setEditDescription(checkpoint.description || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditLocation('')
    setEditDescription('')
  }

  async function saveEdit(checkpointId) {
    if (!editName.trim() || !editLocation.trim()) {
      toast.error('Name and location are required')
      return
    }

    setSaving(true)
    try {
      await api.put(
        `/checkpoints/${checkpointId}`,
        { 
          name: editName.trim(), 
          location: editLocation.trim(), 
          description: editDescription.trim() 
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      toast.success('Checkpoint updated successfully')
      setEditingId(null)
      setEditName('')
      setEditLocation('')
      setEditDescription('')
      setSaving(false)
      await loadCheckpoints()
    } catch (err) {
      console.error('Failed to update checkpoint', err)
      toast.error(err.response?.data?.error || 'Failed to update checkpoint')
      setSaving(false)
    }
  }

  async function deleteCheckpoint(checkpointId) {
    if (!confirm('Are you sure you want to delete this checkpoint?')) return

    setLoading(true)
    try {
      await api.delete(
        `/checkpoints/${checkpointId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      toast.success('Checkpoint deleted successfully')
      await loadCheckpoints()
    } catch (err) {
      console.error('Failed to delete checkpoint', err)
      toast.error(err.response?.data?.error || 'Failed to delete checkpoint')
    } finally {
      setLoading(false)
    }
  }

  async function showQrCode(checkpoint) {
    setSelectedCheckpoint(checkpoint)
    setQrModalOpen(true)

    // Generate QR code with checkpoint ID
    const qrContent = JSON.stringify({
      type: 'patrol-checkpoint',
      id: checkpoint.id,
      name: checkpoint.name
    })

    try {
      const dataUrl = await QRCode.toDataURL(qrContent, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      setQrDataUrl(dataUrl)
    } catch (err) {
      console.error('Failed to generate QR code', err)
    }
  }

  function downloadQr() {
    if (!qrDataUrl || !selectedCheckpoint) return

    const link = document.createElement('a')
    link.download = `checkpoint-${selectedCheckpoint.name.replace(/\s+/g, '-')}.png`
    link.href = qrDataUrl
    link.click()
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Checkpoints</h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            Create and manage patrol checkpoints with QR codes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Create Form */}
        <form
          onSubmit={handleCreate}
          className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 space-y-4 shadow-[var(--shadow)]"
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <IconPlus size={18} />
            Add Checkpoint
          </h3>

          <div className="space-y-2">
            <label className="text-sm text-[color:var(--text-muted)]">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                focus:outline-none focus:border-[color:var(--accent)]"
              placeholder="e.g., Gate A, Main Lobby"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[color:var(--text-muted)]">Location</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                focus:outline-none focus:border-[color:var(--accent)]"
              placeholder="e.g., Building A, North Side"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[color:var(--text-muted)]">Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                focus:outline-none focus:border-[color:var(--accent)] resize-none"
              placeholder="Additional notes..."
            />
          </div>

          <button
            disabled={loading || !name.trim() || !location.trim()}
            className="w-full py-2 rounded-xl bg-[color:var(--accent)]
              hover:bg-[color:var(--accent-strong)] transition font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? 'Creating...' : 'Add Checkpoint'}
          </button>
        </form>

        {/* Checkpoints List */}
        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[color:var(--text-muted)]">
              {checkpoints.length} total
            </span>
          </div>

          <div className="space-y-3">
            {checkpoints.map(checkpoint => (
              <div
                key={checkpoint.id}
                className="rounded-xl border border-[color:var(--border)]
                  bg-[color:var(--bg-muted)] overflow-hidden"
              >
                {editingId === checkpoint.id ? (
                  // Edit Mode
                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[color:var(--text-muted)]">Name</label>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full rounded-lg bg-[color:var(--panel)] border border-[color:var(--border)] px-3 py-2
                          focus:outline-none focus:border-[color:var(--accent)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[color:var(--text-muted)]">Location</label>
                      <input
                        value={editLocation}
                        onChange={e => setEditLocation(e.target.value)}
                        className="w-full rounded-lg bg-[color:var(--panel)] border border-[color:var(--border)] px-3 py-2
                          focus:outline-none focus:border-[color:var(--accent)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[color:var(--text-muted)]">Description</label>
                      <textarea
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg bg-[color:var(--panel)] border border-[color:var(--border)] px-3 py-2
                          focus:outline-none focus:border-[color:var(--accent)] resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(checkpoint.id)}
                        disabled={!editName.trim() || !editLocation.trim() || saving}
                        className="flex-1 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {saving ? (
                          <>
                            <span className="animate-spin">⟳</span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <IconCheck size={16} />
                            Save
                          </>
                        )}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 py-2 rounded-lg bg-[color:var(--border)] hover:bg-gray-400 transition font-medium flex items-center justify-center gap-1"
                      >
                        <IconX size={16} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[color:var(--accent-soft)] flex items-center justify-center">
                          <IconMapPin size={20} className="text-[color:var(--accent)]" />
                        </div>
                        <div>
                          <p className="font-medium">{checkpoint.name}</p>
                          <p className="text-sm text-[color:var(--text-muted)]">{checkpoint.location}</p>
                          {checkpoint.description && (
                            <p className="text-xs text-[color:var(--text-muted)] mt-1">{checkpoint.description}</p>
                          )}
                          <p className="text-xs text-[color:var(--text-muted)] mt-1">ID: {checkpoint.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => showQrCode(checkpoint)}
                          className="p-2 rounded-lg hover:bg-[color:var(--panel)] transition text-[color:var(--text-muted)] hover:text-[color:var(--accent)]"
                          title="Show QR Code"
                        >
                          <IconQrcode size={18} />
                        </button>
                        <button
                          onClick={() => startEdit(checkpoint)}
                          className="p-2 rounded-lg hover:bg-[color:var(--panel)] transition text-[color:var(--text-muted)] hover:text-[color:var(--accent)]"
                          title="Edit checkpoint"
                        >
                          <IconEdit size={18} />
                        </button>
                        <button
                          onClick={() => deleteCheckpoint(checkpoint.id)}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition text-[color:var(--text-muted)] hover:text-red-600"
                          title="Delete checkpoint"
                        >
                          <IconTrash size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!checkpoints.length && (
              <div className="text-center py-8 text-[color:var(--text-muted)]">
                <IconMapPin size={48} className="mx-auto mb-2 opacity-50" />
                <p>No checkpoints yet. Add one to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[color:var(--panel)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">QR Code</h3>
              <button
                onClick={() => {
                  setQrModalOpen(false)
                  setSelectedCheckpoint(null)
                  setQrDataUrl('')
                }}
                className="p-2 rounded-lg hover:bg-[color:var(--bg-muted)] transition"
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center">
              {qrDataUrl ? (
                <>
                  <img
                    ref={qrRef}
                    src={qrDataUrl}
                    alt="QR Code"
                    className="w-64 h-64 rounded-lg border border-[color:var(--border)]"
                  />
                  <p className="mt-4 font-medium text-center">{selectedCheckpoint?.name}</p>
                  <p className="text-sm text-[color:var(--text-muted)] text-center">{selectedCheckpoint?.location}</p>
                </>
              ) : (
                <p className="text-[color:var(--text-muted)]">Generating QR code...</p>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={downloadQr}
                disabled={!qrDataUrl}
                className="flex-1 py-2 rounded-xl bg-[color:var(--accent)]
                  hover:bg-[color:var(--accent-strong)] transition font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <IconDownload size={18} />
                Download
              </button>
              <button
                onClick={() => {
                  setQrModalOpen(false)
                  setSelectedCheckpoint(null)
                  setQrDataUrl('')
                }}
                className="flex-1 py-2 rounded-xl bg-[color:var(--border)] hover:bg-gray-400 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
