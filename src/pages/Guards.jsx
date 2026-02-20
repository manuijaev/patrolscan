import { useEffect, useState } from 'react'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconX,
  IconCheck,
  IconUser,
  IconMapPin,
  IconRefresh
} from '@tabler/icons-react'
import { Toaster, toast } from 'react-hot-toast'
import api from '../api/axios'
import { getToken } from '../auth/authStore'

export default function Guards() {
  const [guards, setGuards] = useState([])
  const [checkpoints, setCheckpoints] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPin, setEditPin] = useState('')
  const [assigningId, setAssigningId] = useState(null)
  const [selectedCheckpoints, setSelectedCheckpoints] = useState([])
  const [completedCheckpoints, setCompletedCheckpoints] = useState({}) // Map of guardId -> completed checkpoint IDs
  
  // Create form state
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')

  async function loadGuards() {
    try {
      const res = await api.get('/guards', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      setGuards(res.data)
      
      // Store completed checkpoints for each guard
      const completed = {}
      res.data.forEach(guard => {
        completed[guard.id] = guard.completedCheckpoints || []
      })
      setCompletedCheckpoints(completed)
    } catch (err) {
      console.error('Failed to load guards', err)
    }
  }

  async function loadCheckpoints() {
    try {
      const res = await api.get('/checkpoints')
      setCheckpoints(res.data)
    } catch (err) {
      console.error('Failed to load checkpoints', err)
    }
  }

  useEffect(() => {
    loadGuards()
    loadCheckpoints()
    
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

  function startAssign(guard) {
    setAssigningId(guard.id)
    setSelectedCheckpoints(guard.assignedCheckpoints || [])
  }

  function cancelAssign() {
    setAssigningId(null)
    setSelectedCheckpoints([])
  }

  async function saveAssignment(guardId) {
    // Validate: at least one checkpoint must be selected
    if (selectedCheckpoints.length === 0) {
      toast.error('Please select at least one checkpoint to assign')
      return
    }
    
    setLoading(true)
    try {
      await api.put(
        `/guards/${guardId}/assign-checkpoints`,
        { checkpointIds: selectedCheckpoints },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      toast.success('Checkpoint assigned successfully')
      setAssigningId(null)
      setSelectedCheckpoints([])
      // Small delay to ensure backend saves data
      await new Promise(resolve => setTimeout(resolve, 100))
      await loadGuards()
    } catch (err) {
      console.error('Failed to assign checkpoints', err)
      toast.error('Failed to assign checkpoints')
    } finally {
      setLoading(false)
    }
  }

  function toggleCheckpoint(cpId) {
    if (selectedCheckpoints.includes(cpId)) {
      setSelectedCheckpoints(selectedCheckpoints.filter(id => id !== cpId))
    } else {
      setSelectedCheckpoints([...selectedCheckpoints, cpId])
    }
  }

  // Re-assign completed checkpoints (add them back to selection)
  function handleReassign(guardId) {
    const completed = completedCheckpoints[guardId] || []
    // Add all completed checkpoints to the selection
    const newSelection = [...new Set([...selectedCheckpoints, ...completed])]
    setSelectedCheckpoints(newSelection)
    toast.success(`Re-assigned ${completed.length} completed checkpoint(s)`)
  }

  return (
    <div className="space-y-6">
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--panel)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          },
        }}
      />
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
                        onClick={() => startAssign(guard)}
                        className="p-2 rounded-lg hover:bg-[color:var(--panel)] transition text-[color:var(--text-muted)] hover:text-blue-600"
                        title="Assign checkpoints"
                      >
                        <IconMapPin size={18} />
                      </button>
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
                
                {/* Assignment Mode */}
                {assigningId === guard.id && (
                  <div className="p-4 border-t border-[color:var(--border)]">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <IconMapPin size={16} />
                        Assign Checkpoints
                      </h4>
                      <button
                        onClick={cancelAssign}
                        className="p-1 rounded-lg hover:bg-[color:var(--border)]"
                      >
                        <IconX size={16} />
                      </button>
                    </div>
                    
                    {/* Re-assign button */}
                    {completedCheckpoints[guard.id]?.length > 0 && (
                      <button
                        onClick={() => handleReassign(guard.id)}
                        className="w-full mb-3 py-2 px-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition flex items-center justify-center gap-1"
                      >
                        <IconRefresh size={14} />
                        Re-assign {completedCheckpoints[guard.id].length} completed checkpoint(s)
                      </button>
                    )}
                    
                    {checkpoints.length === 0 ? (
                      <p className="text-sm text-[color:var(--text-muted)] text-center py-4">
                        No checkpoints available. Create checkpoints first.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {checkpoints.map(cp => {
                          const isCompleted = completedCheckpoints[guard.id]?.includes(cp.id)
                          return (
                            <label
                              key={cp.id}
                              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
                                selectedCheckpoints.includes(cp.id)
                                  ? 'bg-blue-100 dark:bg-blue-900/30'
                                  : 'hover:bg-[color:var(--panel)]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedCheckpoints.includes(cp.id)}
                                onChange={() => toggleCheckpoint(cp.id)}
                                className="w-4 h-4 rounded border-[color:var(--border)] text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm flex-1">{cp.name}</span>
                              {isCompleted && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                  Done
                                </span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => saveAssignment(guard.id)}
                        disabled={loading || selectedCheckpoints.length === 0}
                        className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <IconCheck size={16} />
                        Save
                      </button>
                      <button
                        onClick={cancelAssign}
                        className="flex-1 py-2 rounded-lg bg-[color:var(--border)] hover:bg-gray-400 transition font-medium flex items-center justify-center gap-1"
                      >
                        <IconX size={16} />
                        Cancel
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
