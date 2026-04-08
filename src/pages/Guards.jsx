import { useEffect, useState } from 'react'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconX,
  IconCheck,
  IconUser,
  IconShield,
  IconLock,
  IconShieldCheck,
  IconShieldOff
} from '@tabler/icons-react'
import { toast } from 'react-hot-toast'
import api from '../api/axios'
import { getToken, getUser } from '../auth/authStore'

const ADMIN_ROLE_OPTIONS = [
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'admin', label: 'Admin' },
]

function SupervisorGuardManager() {
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


function AdminTeamManager() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('supervisor')
  const [editingId, setEditingId] = useState(null)
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('admin')
  const [editActive, setEditActive] = useState(true)
  const [editPassword, setEditPassword] = useState('')
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    loadAdmins()
  }, [])

  async function loadAdmins() {
    setLoading(true)
    try {
      const res = await api.get('/admins')
      setAdmins(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Failed to load admins', err)
      toast.error('Unable to load admins at the moment.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!email.trim() || !password) return

    setCreating(true)
    try {
      await api.post('/admins', {
        email: email.trim(),
        password,
        role,
      })
      setEmail('')
      setPassword('')
      setRole('supervisor')
      toast.success('Admin account created')
      await loadAdmins()
    } catch (err) {
      console.error('Failed to create admin', err)
      toast.error(err.response?.data?.message || 'Unable to create admin')
    } finally {
      setCreating(false)
    }
  }

  function startEdit(admin) {
    setEditingId(admin.id)
    setEditEmail(admin.email)
    setEditRole(admin.role)
    setEditActive(admin.isActive)
    setEditPassword('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditEmail('')
    setEditRole('admin')
    setEditPassword('')
    setEditActive(true)
  }

  async function handleUpdate(adminId) {
    if (!editEmail.trim()) return
    setProcessingId(adminId)
    try {
      await api.put(`/admins/${adminId}`, {
        email: editEmail.trim(),
        role: editRole,
        isActive: editActive,
        password: editPassword || undefined,
      })
      toast.success('Admin updated')
      cancelEdit()
      await loadAdmins()
    } catch (err) {
      console.error('Failed to update admin', err)
      toast.error(err.response?.data?.message || 'Unable to update admin')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleToggleActive(admin) {
    if (admin.role === 'super-admin') return
    setProcessingId(admin.id)
    try {
      await api.put(`/admins/${admin.id}`, { isActive: !admin.isActive })
      toast.success(admin.isActive ? 'Admin deactivated' : 'Admin reactivated')
      await loadAdmins()
    } catch (err) {
      console.error('Failed to toggle admin', err)
      toast.error('Unable to update admin status')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleDelete(adminId) {
    if (!confirm('Remove this admin permanently?')) return
    setProcessingId(adminId)
    try {
      await api.delete(`/admins/${adminId}`)
      toast.success('Admin removed')
      await loadAdmins()
    } catch (err) {
      console.error('Failed to delete admin', err)
      toast.error(err.response?.data?.message || 'Unable to delete admin')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Admin & Supervisor Accounts</h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            Create admins or supervisors and keep the super admin protected.
          </p>
        </div>
        <p className="text-sm text-[color:var(--text-muted)]">
          {loading ? 'Loading accounts…' : `${admins.length} admins total`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <form
          onSubmit={handleCreate}
          className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 space-y-4 shadow-[var(--shadow)]"
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <IconShield size={18} />
            Create Administrator
          </h3>

          <div className="space-y-2">
            <label className="text-sm text-[color:var(--text-muted)]">Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                focus:outline-none focus:border-[color:var(--accent)]"
              placeholder="admin@patrolscan.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[color:var(--text-muted)]">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                  focus:outline-none focus:border-[color:var(--accent)]"
                placeholder="Secure password"
              />
              <IconLock className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" size={18} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[color:var(--text-muted)]">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                focus:outline-none focus:border-[color:var(--accent)]"
            >
              {ADMIN_ROLE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            disabled={creating || !email.trim() || !password}
            className="w-full py-2 rounded-xl bg-[color:var(--accent)]
              hover:bg-[color:var(--accent-strong)] transition font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {creating ? 'Creating…' : 'Create Admin'}
          </button>
        </form>

        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 shadow-[var(--shadow)] space-y-3">
          {loading ? (
            <p className="text-sm text-[color:var(--text-muted)]">Fetching admin accounts…</p>
          ) : admins.length === 0 ? (
            <div className="text-center text-[color:var(--text-muted)]">
              <IconShieldCheck size={36} className="mx-auto mb-2" />
              <p>No additional admins yet.</p>
            </div>
          ) : (
            admins.map(admin => {
              const isSuper = admin.role === 'super-admin'
              return (
                <div
                  key={admin.id}
                  className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-muted)] overflow-hidden"
                >
                  {editingId === admin.id ? (
                    <div className="p-4 space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-[color:var(--text-muted)]">Email</label>
                        <input
                          value={editEmail}
                          onChange={e => setEditEmail(e.target.value)}
                          className="w-full rounded-lg bg-[color:var(--panel)] border border-[color:var(--border)] px-3 py-2
                            focus:outline-none focus:border-[color:var(--accent)]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-[color:var(--text-muted)]">Role</label>
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value)}
                          className="w-full rounded-lg bg-[color:var(--panel)] border border-[color:var(--border)] px-3 py-2
                            focus:outline-none focus:border-[color:var(--accent)]"
                          disabled={isSuper}
                        >
                          {ADMIN_ROLE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-[color:var(--text-muted)]">New Password (optional)</label>
                        <input
                          type="password"
                          value={editPassword}
                          onChange={e => setEditPassword(e.target.value)}
                          className="w-full rounded-lg bg-[color:var(--panel)] border border-[color:var(--border)] px-3 py-2
                            focus:outline-none focus:border-[color:var(--accent)]"
                          placeholder="Leave blank to keep current"
                        />
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={editActive}
                          disabled={isSuper}
                          onChange={e => setEditActive(e.target.checked)}
                          className="h-4 w-4 rounded border-[color:var(--border)] dark:border-gray-600"
                        />
                        <span className="text-sm">Account active</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(admin.id)}
                          disabled={processingId === admin.id || !editEmail.trim()}
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
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{admin.email}</p>
                        <p className="text-xs text-[color:var(--text-muted)]">{admin.role.replace('-', ' ')}</p>
                        <p className={`text-xs mt-1 ${admin.isActive ? 'text-green-600' : 'text-red-500'}`}>
                          {admin.isActive ? 'Active' : 'Disabled'} {isSuper ? '· Super admin' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(admin)}
                          className="p-2 rounded-lg hover:bg-[color:var(--panel)] transition text-[color:var(--text-muted)]"
                          title={admin.isActive ? 'Deactivate account' : 'Reactivate account'}
                          disabled={admin.role === 'super-admin' || processingId === admin.id}
                        >
                          {admin.isActive ? <IconShieldCheck size={18} /> : <IconShieldOff size={18} />}
                        </button>
                        <button
                          onClick={() => startEdit(admin)}
                          className="p-2 rounded-lg hover:bg-[color:var(--panel)] transition text-[color:var(--text-muted)]"
                          title="Edit admin"
                          disabled={admin.role === 'super-admin'}
                        >
                          <IconEdit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(admin.id)}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition text-[color:var(--text-muted)] hover:text-red-600"
                          title="Delete admin"
                          disabled={admin.role === 'super-admin'}
                        >
                          <IconTrash size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default function Guards() {
  const user = getUser()
  return user?.role === 'supervisor' ? <SupervisorGuardManager /> : <AdminTeamManager />
}
