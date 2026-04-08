import { useEffect, useState } from 'react'
import {
  IconSettings,
  IconClock,
  IconRefresh,
  IconCheck,
  IconX
} from '@tabler/icons-react'
import { toast } from 'react-hot-toast'
import api from '../api/axios'
import { getToken } from '../auth/authStore'

export default function Settings() {
  const [patrolMode, setPatrolMode] = useState('FREE')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Schedule config
  const [startTime, setStartTime] = useState('06:00')
  const [endTime, setEndTime] = useState('18:00')
  const [frequencyMinutes, setFrequencyMinutes] = useState(60)
  const [previewSlots, setPreviewSlots] = useState(null)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const token = getToken()
      
      // Load patrol mode
      const modeRes = await api.get('/settings/patrol-mode', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPatrolMode(modeRes.data.patrolMode || 'FREE')
      
      // Load schedule config
      const configRes = await api.get('/settings/schedule-config', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (configRes.data.config) {
        setStartTime(configRes.data.config.startTime)
        setEndTime(configRes.data.config.endTime)
        setFrequencyMinutes(configRes.data.config.frequencyMinutes)
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleModeChange(newMode) {
    setSaving(true)
    try {
      const token = getToken()
      await api.put('/settings/patrol-mode', 
        { patrolMode: newMode },
        { headers: { Authorization: `Bearer ${token}` }
      })
      setPatrolMode(newMode)
      toast.success(`Patrol mode changed to ${newMode}`)
    } catch (err) {
      toast.error('Failed to update patrol mode')
    } finally {
      setSaving(false)
    }
  }

  async function handlePreview() {
    setPreviewing(true)
    try {
      const token = getToken()
      const res = await api.post('/settings/schedule-preview',
        { startTime, endTime, frequencyMinutes },
        { headers: { Authorization: `Bearer ${token}` }
      })
      setPreviewSlots(res.data)
    } catch (err) {
      const errors = err.response?.data?.errors || err.response?.data?.error
      if (Array.isArray(errors)) {
        errors.forEach(e => toast.error(e))
      } else {
        toast.error(errors || 'Failed to preview schedule')
      }
    } finally {
      setPreviewing(false)
    }
  }

  async function handleActivateScheduled() {
    // First preview to validate
    await handlePreview()
    if (!previewSlots) return
    
    setSaving(true)
    try {
      const token = getToken()
      await api.post('/settings/schedule-config',
        { startTime, endTime, frequencyMinutes },
        { headers: { Authorization: `Bearer ${token}` }
      })
      
      // Switch to scheduled mode
      await api.put('/settings/patrol-mode',
        { patrolMode: 'SCHEDULED' },
        { headers: { Authorization: `Bearer ${token}` }
      })
      
      setPatrolMode('SCHEDULED')
      toast.success('Scheduled mode activated')
      setPreviewSlots(null)
    } catch (err) {
      toast.error('Failed to activate scheduled mode')
    } finally {
      setSaving(false)
    }
  }

  async function handleActivateFree() {
    setSaving(true)
    try {
      const token = getToken()
      await api.put('/settings/patrol-mode',
        { patrolMode: 'FREE' },
        { headers: { Authorization: `Bearer ${token}` }
      })
      setPatrolMode('FREE')
      toast.success('Free mode activated')
    } catch (err) {
      toast.error('Failed to activate free mode')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconRefresh className="animate-spin text-[color:var(--accent)]" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Settings</h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            Configure patrol mode and schedule.
          </p>
        </div>
      </div>

      {/* Patrol Mode Selection */}
      <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 shadow-[var(--shadow)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <IconSettings size={20} />
          Patrol Mode
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Free Mode */}
          <div 
            className={`p-4 rounded-xl border-2 transition cursor-pointer ${
              patrolMode === 'FREE' 
                ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/10' 
                : 'border-[color:var(--border)] hover:border-[color:var(--accent)]'
            }`}
            onClick={() => handleModeChange('FREE')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Free Mode</span>
              {patrolMode === 'FREE' && (
                <IconCheck size={20} className="text-[color:var(--accent)]" />
              )}
            </div>
            <p className="text-sm text-[color:var(--text-muted)]">
              Guards can scan checkpoints anytime. System logs scans for review.
            </p>
          </div>

          {/* Scheduled Mode */}
          <div 
            className={`p-4 rounded-xl border-2 transition cursor-pointer ${
              patrolMode === 'SCHEDULED' 
                ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/10' 
                : 'border-[color:var(--border)] hover:border-[color:var(--accent)]'
            }`}
            onClick={() => handleModeChange('SCHEDULED')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Scheduled Mode</span>
              {patrolMode === 'SCHEDULED' && (
                <IconCheck size={20} className="text-[color:var(--accent)]" />
              )}
            </div>
            <p className="text-sm text-[color:var(--text-muted)]">
              Guards must scan within defined time slots. System tracks compliance.
            </p>
          </div>
        </div>
      </div>

      {/* Schedule Configuration */}
      {patrolMode === 'FREE' && (
        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 shadow-[var(--shadow)]">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <IconClock size={20} />
            Schedule Configuration
          </h3>
          <p className="text-sm text-[color:var(--text-muted)] mb-4">
            Configure time slots for scheduled patrol mode.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-[color:var(--text-muted)] mb-1 block">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                  focus:outline-none focus:border-[color:var(--accent)] text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-[color:var(--text-muted)] mb-1 block">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                  focus:outline-none focus:border-[color:var(--accent)] text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-[color:var(--text-muted)] mb-1 block">
                Interval (minutes)
              </label>
              <select
                value={frequencyMinutes}
                onChange={(e) => setFrequencyMinutes(Number(e.target.value))}
                className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                  focus:outline-none focus:border-[color:var(--accent)] text-sm"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
                <option value={240}>4 hours</option>
                <option value={360}>6 hours</option>
                <option value={480}>8 hours</option>
              </select>
            </div>
          </div>

          {/* Schedule Type Indicator */}
          {(() => {
            const [startH] = startTime.split(':').map(Number)
            const [endH] = endTime.split(':').map(Number)
            const isOvernight = endH < startH || (endH === 0)
            return isOvernight ? (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Overnight schedule: patrols run from {startTime} to {endH === 0 ? '24:00' : endTime} (next day)
                </p>
              </div>
            ) : null
          })()}

          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={previewing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[color:var(--border)] 
                hover:bg-[color:var(--bg-muted)] transition text-sm disabled:opacity-50"
            >
              <IconRefresh size={16} className={previewing ? 'animate-spin' : ''} />
              Preview Schedule
            </button>
            <button
              onClick={handleActivateScheduled}
              disabled={saving || !previewSlots}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[color:var(--accent)]
                hover:bg-[color:var(--accent-strong)] transition font-medium disabled:opacity-50"
            >
              <IconCheck size={16} />
              Activate Scheduled Mode
            </button>
          </div>

          {/* Preview Results */}
          {previewSlots && (
            <div className="mt-4 p-4 rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)]">
              <p className="text-sm font-medium mb-2">
                Total Slots: {previewSlots.totalSlots}
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {previewSlots.slots.map((slot, idx) => (
                  <div key={idx} className="text-xs text-[color:var(--text-muted)] flex justify-between">
                    <span>Slot {idx + 1}</span>
                    <span>{slot.startTime} - {slot.endTime}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scheduled Mode Active */}
      {patrolMode === 'SCHEDULED' && (
        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 shadow-[var(--shadow)]">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <IconClock size={20} />
            Active Schedule
          </h3>
          
          <div className="flex items-center gap-4 mb-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <IconCheck size={20} className="text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Scheduled mode is active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-[color:var(--text-muted)] mb-1 block">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                  focus:outline-none focus:border-[color:var(--accent)] text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-[color:var(--text-muted)] mb-1 block">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                  focus:outline-none focus:border-[color:var(--accent)] text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-[color:var(--text-muted)] mb-1 block">
                Interval (minutes)
              </label>
              <select
                value={frequencyMinutes}
                onChange={(e) => setFrequencyMinutes(Number(e.target.value))}
                className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                  focus:outline-none focus:border-[color:var(--accent)] text-sm"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
                <option value={240}>4 hours</option>
                <option value={360}>6 hours</option>
                <option value={480}>8 hours</option>
              </select>
            </div>
          </div>

          {/* Schedule Type Indicator */}
          {(() => {
            const [startH] = startTime.split(':').map(Number)
            const [endH] = endTime.split(':').map(Number)
            const isOvernight = endH < startH || (endH === 0)
            return isOvernight ? (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Overnight schedule: patrols run from {startTime} to {endH === 0 ? '24:00' : endTime} (next day)
                </p>
              </div>
            ) : null
          })()}

          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={previewing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[color:var(--border)] 
                hover:bg-[color:var(--bg-muted)] transition text-sm disabled:opacity-50"
            >
              <IconRefresh size={16} className={previewing ? 'animate-spin' : ''} />
              Preview Changes
            </button>
            <button
              onClick={handleActivateFree}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500 text-red-500
                hover:bg-red-50 dark:hover:bg-red-900/20 transition text-sm disabled:opacity-50"
            >
              <IconX size={16} />
              Switch to Free Mode
            </button>
          </div>

          {/* Preview Results */}
          {previewSlots && (
            <div className="mt-4 p-4 rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)]">
              <p className="text-sm font-medium mb-2">
                New Schedule: {previewSlots.totalSlots} slots
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {previewSlots.slots.map((slot, idx) => (
                  <div key={idx} className="text-xs text-[color:var(--text-muted)] flex justify-between">
                    <span>Slot {idx + 1}</span>
                    <span>{slot.startTime} - {slot.endTime}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
