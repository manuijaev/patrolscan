import { useEffect, useState } from 'react'
import {
  IconPlus,
  IconTrash,
  IconX,
  IconCheck,
  IconUser,
  IconMapPin,
  IconRefresh,
  IconArrowRight,
  IconClock
} from '@tabler/icons-react'
import { toast } from 'react-hot-toast'
import api from '../api/axios'
import { getToken } from '../auth/authStore'

export default function UpcomingPatrols() {
  const [patrols, setPatrols] = useState([])
  const [guards, setGuards] = useState([])
  const [checkpoints, setCheckpoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedGuard, setSelectedGuard] = useState(null)
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null)
  const [showChangeGuardModal, setShowChangeGuardModal] = useState(false)
  const [selectedPatrol, setSelectedPatrol] = useState(null)
  const [newGuardId, setNewGuardId] = useState(null)

  async function loadData() {
    try {
      const token = getToken()
      
      // Load patrols
      const patrolRes = await api.get('/patrol-assignments', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPatrols(patrolRes.data)
      
      // Load guards
      const guardRes = await api.get('/guards', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setGuards(guardRes.data)
      console.log('Guards loaded:', guardRes.data)
      
      // Load checkpoints
      const cpRes = await api.get('/checkpoints')
      setCheckpoints(cpRes.data)
      console.log('Checkpoints loaded:', cpRes.data)
    } catch (err) {
      console.error('Failed to load data', err)
      setError(err.message)
      if (err.response) {
        console.error('Response:', err.response.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    
    // Auto-refresh every 5 seconds for real-time updates
    const interval = setInterval(() => {
      loadData()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  // Get unassigned checkpoints
  function getUnassignedCheckpoints() {
    const assignedIds = new Set()
    patrols.forEach(p => {
      p.checkpoints.forEach(cp => {
        assignedIds.add(cp.checkpointId)
      })
    })
    return checkpoints.filter(cp => !assignedIds.has(cp.id))
  }

  // Handle assign checkpoint to guard
  async function handleAssign() {
    if (!selectedGuard || !selectedCheckpoint) {
      toast.error('Please select a guard and checkpoint')
      return
    }

    try {
      const token = getToken()
      await api.post('/patrol-assignments/assign', {
        guardId: selectedGuard,
        checkpointId: selectedCheckpoint
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast.success('Checkpoint assigned successfully')
      setShowAssignModal(false)
      setSelectedGuard(null)
      setSelectedCheckpoint(null)
      await loadData()
    } catch (err) {
      console.error('Failed to assign', err)
      toast.error(err.response?.data?.message || 'Failed to assign checkpoint')
    }
  }

  // Handle remove checkpoint from guard
  async function handleRemove(guardId, checkpointId) {
    if (!confirm('Are you sure you want to remove this checkpoint assignment?')) return
    
    try {
      const token = getToken()
      await api.delete(`/patrol-assignments/remove/${guardId}/${checkpointId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast.success('Checkpoint removed successfully')
      await loadData()
    } catch (err) {
      console.error('Failed to remove', err)
      toast.error('Failed to remove checkpoint')
    }
  }

  // Handle re-assign completed checkpoint
  async function handleReassign(guardId, checkpointId) {
    const previousPatrols = patrols.map(patrol => ({
      ...patrol,
      checkpoints: [...(patrol.checkpoints || [])]
    }))

    setPatrols(prev => prev.map(patrol => {
      if (Number(patrol.guardId) !== Number(guardId)) return patrol

      const updatedCheckpoints = (patrol.checkpoints || []).map(cp => {
        if (String(cp.checkpointId) !== String(checkpointId)) return cp
        return { ...cp, status: 'pending', completedAt: null }
      })

      return {
        ...patrol,
        checkpoints: updatedCheckpoints,
        completedToday: updatedCheckpoints.filter(cp => cp.status === 'completed').length
      }
    }))

    try {
      const token = getToken()
      await api.post('/patrol-assignments/reassign', {
        guardId,
        checkpointId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast.success('Checkpoint re-assigned. Guard needs to scan it again.')
      await loadData()
    } catch (err) {
      setPatrols(previousPatrols)
      console.error('Failed to reassign', err)
      toast.error(err.response?.data?.message || 'Failed to re-assign checkpoint')
    }
  }

  // Handle change guard for checkpoint
  async function handleChangeGuard() {
    if (!selectedPatrol || !newGuardId) {
      toast.error('Please select a guard')
      return
    }

    try {
      const token = getToken()
      await api.put('/patrol-assignments/update', {
        checkpointId: selectedPatrol.checkpointId,
        newGuardId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast.success('Guard changed successfully')
      setShowChangeGuardModal(false)
      setSelectedPatrol(null)
      setNewGuardId(null)
      await loadData()
    } catch (err) {
      console.error('Failed to change guard', err)
      toast.error('Failed to change guard')
    }
  }

  function openChangeGuardModal(patrol, checkpoint) {
    setSelectedPatrol({ ...checkpoint, guardId: patrol.guardId, guardName: patrol.guardName })
    setNewGuardId(null)
    setShowChangeGuardModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error: {error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Upcoming Patrols</h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            Manage guard patrol assignments and checkpoints.
          </p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          disabled={guards.length === 0 || checkpoints.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-strong)] transition font-medium disabled:opacity-50"
        >
          <IconPlus size={18} />
          Assign Checkpoint
        </button>
      </div>

      {/* Patrol Assignments */}
      <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 shadow-[var(--shadow)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Patrol Assignments</h3>
          <span className="text-sm text-[color:var(--text-muted)]">
            {patrols.length} active assignments
          </span>
        </div>

        {guards.length === 0 || checkpoints.length === 0 ? (
          <div className="text-center py-8 text-[color:var(--text-muted)]">
            <IconMapPin size={48} className="mx-auto mb-2 opacity-50" />
            <p>Cannot create patrol assignments.</p>
            {guards.length === 0 && <p className="text-sm">Please create guards first in the Guards tab.</p>}
            {checkpoints.length === 0 && <p className="text-sm">Please create checkpoints first in the Checkpoints tab.</p>}
          </div>
        ) : patrols.length === 0 ? (
          <div className="text-center py-8 text-[color:var(--text-muted)]">
            <IconMapPin size={48} className="mx-auto mb-2 opacity-50" />
            <p>No patrol assignments yet.</p>
            <p className="text-sm">Click "Assign Checkpoint" to create one.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {patrols.map(patrol => (
              <div
                key={patrol.guardId}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-muted)] overflow-hidden"
              >
                {/* Guard Header */}
                <div className="flex items-center justify-between p-4 bg-[color:var(--panel)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[color:var(--accent-soft)] flex items-center justify-center">
                      <IconUser size={20} className="text-[color:var(--accent)]" />
                    </div>
                    <div>
                      <p className="font-medium">{patrol.guardName}</p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {patrol.completedToday}/{patrol.totalAssigned} completed
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    patrol.completedToday === patrol.totalAssigned
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}>
                    {patrol.completedToday === patrol.totalAssigned ? 'Complete' : 'In Progress'}
                  </div>
                </div>

                {/* Checkpoints List */}
                <div className="p-4 space-y-2">
                  {patrol.checkpoints.map(cp => (
                    <div
                      key={cp.checkpointId}
                      className="flex items-center justify-between p-3 rounded-lg bg-[color:var(--panel)] border border-[color:var(--border)]"
                    >
                      <div className="flex items-center gap-3">
                        {cp.status === 'completed' ? (
                          <IconCheck size={18} className="text-green-500" />
                        ) : (
                          <IconClock size={18} className="text-blue-400" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{cp.name}</p>
                          {cp.location && (
                            <p className="text-xs text-[color:var(--text-muted)]">{cp.location}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cp.status === 'completed' && (
                          <button
                            onClick={() => handleReassign(patrol.guardId, cp.checkpointId)}
                            className="p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600"
                            title="Re-assign"
                          >
                            <IconRefresh size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => openChangeGuardModal(patrol, cp)}
                          className="p-2 rounded-lg hover:bg-[color:var(--bg-muted)] text-[color:var(--text-muted)]"
                          title="Change guard"
                        >
                          <IconArrowRight size={16} />
                        </button>
                        <button
                          onClick={() => handleRemove(patrol.guardId, cp.checkpointId)}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                          title="Remove"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Assign Checkpoint</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setSelectedGuard(null)
                  setSelectedCheckpoint(null)
                }}
                className="p-2 rounded-lg hover:bg-[color:var(--border)]"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[color:var(--text-muted)] mb-1">Select Guard</label>
                <select
                  value={selectedGuard || ''}
                  onChange={e => setSelectedGuard(Number(e.target.value))}
                  className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2 focus:outline-none focus:border-[color:var(--accent)]"
                >
                  <option value="">Choose a guard...</option>
                  {guards.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                {guards.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No guards registered. Create guards first in the Guards tab.</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-[color:var(--text-muted)] mb-1">Select Checkpoint</label>
                <select
                  value={selectedCheckpoint || ''}
                  onChange={e => setSelectedCheckpoint(e.target.value)}
                  className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2 focus:outline-none focus:border-[color:var(--accent)]"
                >
                  <option value="">Choose a checkpoint...</option>
                  {getUnassignedCheckpoints().map(cp => (
                    <option key={cp.id} value={cp.id}>{cp.name} - {cp.location || 'No location'}</option>
                  ))}
                </select>
                {getUnassignedCheckpoints().length === 0 && checkpoints.length === 0 ? (
                  <p className="text-xs text-amber-600 mt-1">No checkpoints available. Create checkpoints first.</p>
                ) : getUnassignedCheckpoints().length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">All checkpoints are assigned</p>
                )}
              </div>

              <button
                onClick={handleAssign}
                disabled={!selectedGuard || !selectedCheckpoint}
                className="w-full py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <IconCheck size={16} />
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Guard Modal */}
      {showChangeGuardModal && selectedPatrol && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Change Guard</h3>
              <button
                onClick={() => {
                  setShowChangeGuardModal(false)
                  setSelectedPatrol(null)
                  setNewGuardId(null)
                }}
                className="p-2 rounded-lg hover:bg-[color:var(--border)]"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[color:var(--bg-muted)]">
                <p className="text-sm text-[color:var(--text-muted)]">Current Assignment</p>
                <p className="font-medium">{selectedPatrol.name}</p>
                <p className="text-sm text-[color:var(--text-muted)]">Assigned to: {selectedPatrol.guardName}</p>
              </div>

              <div>
                <label className="block text-sm text-[color:var(--text-muted)] mb-1">New Guard</label>
                <select
                  value={newGuardId || ''}
                  onChange={e => setNewGuardId(Number(e.target.value))}
                  className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2 focus:outline-none focus:border-[color:var(--accent)]"
                >
                  <option value="">Choose a guard...</option>
                  {guards.filter(g => g.id !== selectedPatrol.guardId).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleChangeGuard}
                disabled={!newGuardId}
                className="w-full py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <IconCheck size={16} />
                Change Guard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
