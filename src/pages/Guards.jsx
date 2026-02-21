import { useEffect, useState } from 'react'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconX,
  IconCheck,
  IconUser
} from '@tabler/icons-react'
import { toast } from 'react-hot-toast'
import api from '../api/axios'
import { getToken } from '../auth/authStore'

export default function Guards() {
  const [guards, setGuards] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPin, setEditPin] = useState('')
  
  // Create form state
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')

  async function loadGuards() {
    try {
      const res = await api.get('/guards', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      setGuards(res.data)
    } catch (err) {
      console.error('Failed to load guards', err)
    }
  }

  useEffect(() => {
    loadGuards()
    
    // Auto-refresh every 10 seconds to keep data up to date
    const interval = setInterval(() => {
      loadGuards()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim() || pin.length !== 4) return

    setLoading(true)
    try {
      await api.post(
        '/guards',
        { name: name.trim(), pin },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      setName('')
      setPin('')
      await loadGuards()
    } catch (err) {
      console.error('Failed to create guard', err)
    } finally {
      setLoading(false)
    }
  }

  function startEdit(guard) {
    setEditingId(guard.id)
    setEditName(guard.name)
    setEditPin('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditPin('')
  }

  async function saveEdit(guardId) {
    if (!editName.trim()) return
    
    setLoading(true)
    try {
      await api.put(
        `/guards/${guardId}`,
        { name: editName.trim(), pin: editPin || undefined },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      setEditingId(null)
      setEditPin('')
      await loadGuards()
    } catch (err) {
      console.error('Failed to update guard', err)
    } finally {
      setLoading(false)
    }
  }

  async function deleteGuard(guardId) {
    if (!confirm('Are you sure you want to delete this guard?')) return

    setLoading(true)
    try {
      await api.delete(
        `/guards/${guardId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      await loadGuards()
    } catch (err) {
      console.error('Failed to delete guard', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Guards</h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            Manage guard access, PINs, and assignments.
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
            Register Guard
          </h3>

          <div className="space-y-2">
            <label className="text-sm text-[color:var(--text-muted)]">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                focus:outline-none focus:border-[color:var(--accent)]"
              placeholder="Guard name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[color:var(--text-muted)]">PIN (4 digits)</label>
            <input
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              maxLength={4}
              inputMode="numeric"
              className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                focus:outline-none focus:border-[color:var(--accent)] text-lg tracking-widest"
              placeholder="1234"
            />
          </div>

          <button
            disabled={loading || pin.length !== 4 || !name.trim()}
            className="w-full py-2 rounded-xl bg-[color:var(--accent)]
              hover:bg-[color:var(--accent-strong)] transition font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? 'Creating...' : 'Create Guard'}
          </button>
        </form>

        {/* Guards List */}
        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[color:var(--text-muted)]">
              {guards.length} total
            </span>
          </div>

          <div className="space-y-3">
            {guards.map(guard => (
              <div
                key={guard.id}
                className="rounded-xl border border-[color:var(--border)]
                  bg-[color:var(--bg-muted)] overflow-hidden"
              >
                {editingId === guard.id ? (
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
                      <label className="text-xs text-[color:var(--text-muted)]">New PIN (optional)</label>
                      <input
                        value={editPin}
                        onChange={e => setEditPin(e.target.value.replace(/\D/g, ''))}
                        maxLength={4}
                        inputMode="numeric"
                        className="w-full rounded-lg bg-[color:var(--panel)] border border-[color:var(--border)] px-3 py-2
                          focus:outline-none focus:border-[color:var(--accent)] text-lg tracking-widest"
                        placeholder="Leave empty to keep current"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(guard.id)}
                        disabled={!editName.trim() || loading}
                        className="flex-1 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <IconCheck size={16} />
                        Save
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
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[color:var(--accent-soft)] flex items-center justify-center">
                        <IconUser size={20} className="text-[color:var(--accent)]" />
                      </div>
                      <div>
                        <p className="font-medium">{guard.name}</p>
                        <p className="text-xs text-[color:var(--text-muted)]">ID {guard.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(guard)}
                        className="p-2 rounded-lg hover:bg-[color:var(--panel)] transition text-[color:var(--text-muted)] hover:text-[color:var(--accent)]"
                        title="Edit guard"
                      >
                        <IconEdit size={18} />
                      </button>
                      <button
                        onClick={() => deleteGuard(guard.id)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition text-[color:var(--text-muted)] hover:text-red-600"
                        title="Delete guard"
                      >
                        <IconTrash size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!guards.length && (
              <div className="text-center py-8 text-[color:var(--text-muted)]">
                <IconUser size={48} className="mx-auto mb-2 opacity-50" />
                <p>No guards yet. Create one to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
