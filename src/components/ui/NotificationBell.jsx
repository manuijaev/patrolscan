import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconAlertTriangle,
  IconBell,
  IconCheck,
  IconChevronRight,
  IconShieldLock,
  IconTargetArrow
} from '@tabler/icons-react'
import { toast } from 'react-hot-toast'
import api from '../../api/axios'
import { getToken } from '../../auth/authStore'

const CACHE_KEY = 'admin_notifications_cache_v2'
const STATE_KEY = 'admin_notifications_state_v2'
const QUEUE_KEY = 'admin_notifications_sync_queue_v2'
const CRITICAL_SOUND_URL = '/sounds/public/critical-alert.mp3'
const STANDARD_SOUND_URL = '/sounds/public/notification-soft.mp3'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures
  }
}

function playCriticalNotificationSound() {
  try {
    const audio = new Audio(CRITICAL_SOUND_URL)
    audio.preload = 'auto'
    audio.volume = 0.75
    audio.play().catch(() => {
      playCriticalFallbackTone()
    })
  } catch {
    playCriticalFallbackTone()
  }
}

function playCriticalFallbackTone() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    const tone = (frequency, start, duration, gainValue) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = frequency
      gain.gain.value = 0.0001

      osc.connect(gain)
      gain.connect(ctx.destination)

      gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

      osc.start(start)
      osc.stop(start + duration + 0.02)
    }

    tone(880, now + 0.02, 0.12, 0.08)
    tone(1175, now + 0.18, 0.14, 0.075)
    setTimeout(() => {
      try {
        ctx.close()
      } catch {
        // no-op
      }
    }, 650)
  } catch {
    // no-op
  }
}

function playStandardNotificationSound() {
  try {
    const audio = new Audio(STANDARD_SOUND_URL)
    audio.preload = 'auto'
    audio.volume = 0.5
    audio.play().catch(() => {
      playStandardFallbackTone()
    })
  } catch {
    playStandardFallbackTone()
  }
}

function playStandardFallbackTone() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 740
    gain.gain.value = 0.0001
    osc.connect(gain)
    gain.connect(ctx.destination)

    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11)
    osc.start(now + 0.01)
    osc.stop(now + 0.12)

    setTimeout(() => {
      try {
        ctx.close()
      } catch {
        // no-op
      }
    }, 300)
  } catch {
    // no-op
  }
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(() => readJson(CACHE_KEY, []))
  const [filter, setFilter] = useState('all')
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const panelRef = useRef(null)
  const previousCriticalUnreadIdsRef = useRef(new Set())
  const previousNonCriticalUnreadIdsRef = useRef(new Set())

  const unreadCount = useMemo(
    () => items.filter(item => item.unread).length,
    [items]
  )

  const unreadBySeverity = useMemo(() => {
    return {
      critical: items.filter(i => i.unread && i.severity === 'critical').length,
      warning: items.filter(i => i.unread && i.severity === 'warning').length,
    }
  }, [items])

  const filteredItems = useMemo(() => {
    if (filter === 'unread') return items.filter(item => item.unread)
    if (filter === 'critical') return items.filter(item => item.severity === 'critical')
    if (filter === 'warning') return items.filter(item => item.severity === 'warning')
    return items
  }, [items, filter])

  function formatTimeAgo(timeAgoMinutes) {
    if (timeAgoMinutes <= 0) return 'Just now'
    if (timeAgoMinutes < 60) return `${timeAgoMinutes}m ago`
    const hours = Math.floor(timeAgoMinutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  function getSeverityClasses(severity) {
    if (severity === 'critical') {
      return 'border-red-300/70 bg-red-50/70 dark:border-red-700/60 dark:bg-red-900/20'
    }
    if (severity === 'warning') {
      return 'border-amber-300/70 bg-amber-50/70 dark:border-amber-700/60 dark:bg-amber-900/20'
    }
    return 'border-blue-300/70 bg-blue-50/70 dark:border-blue-700/60 dark:bg-blue-900/20'
  }

  function getTypeIcon(type) {
    if (type === 'repeated_location_failures') return <IconTargetArrow size={15} className="text-red-500" />
    if (type === 'unauthorized_attempt') return <IconShieldLock size={15} className="text-red-500" />
    if (type === 'reassign_needed') return <IconAlertTriangle size={15} className="text-amber-500" />
    return <IconBell size={15} className="text-blue-500" />
  }

  function buildActionPath(item) {
    const action = item.action
    if (!action?.path) return null
    if (item.type === 'reassign_needed') {
      const guardId = action.params?.guardId
      const checkpointId = action.params?.checkpointId
      if (guardId && checkpointId) {
        return `${action.path}?highlightGuard=${encodeURIComponent(guardId)}&highlightCheckpoint=${encodeURIComponent(checkpointId)}`
      }
    }
    return action.path
  }

  function getGroupKey(item) {
    const action = item.action || {}
    const guardId = action.params?.guardId || ''
    const checkpointId = action.params?.checkpointId || ''
    return `${item.type}::${item.title}::${item.severity}::${guardId}::${checkpointId}`
  }

  function groupNotifications(notifications) {
    const groups = new Map()
    for (const item of notifications) {
      const key = getGroupKey(item)
      const existing = groups.get(key)
      if (!existing) {
        groups.set(key, { ...item, aggregateCount: 1 })
      } else {
        const latestTime = new Date(existing.time) > new Date(item.time) ? existing.time : item.time
        groups.set(key, {
          ...existing,
          unread: existing.unread || item.unread,
          acknowledged: existing.acknowledged && item.acknowledged,
          time: latestTime,
          timeAgoMinutes: Math.min(existing.timeAgoMinutes || 0, item.timeAgoMinutes || 0),
          aggregateCount: existing.aggregateCount + 1,
          detail:
            item.type === 'repeated_location_failures'
              ? existing.detail
              : `${existing.detail.split(' (x')[0]} (x${existing.aggregateCount + 1})`,
        })
      }
    }
    return [...groups.values()].sort((a, b) => new Date(b.time) - new Date(a.time))
  }

  function getLocalState() {
    return readJson(STATE_KEY, { reads: [], acks: [] })
  }

  function saveLocalState(state) {
    writeJson(STATE_KEY, state)
  }

  function queueSyncAction(action) {
    const queue = readJson(QUEUE_KEY, [])
    queue.push(action)
    writeJson(QUEUE_KEY, queue)
  }

  async function flushSyncQueue() {
    const queue = readJson(QUEUE_KEY, [])
    if (!queue.length) return
    if (!navigator.onLine) return

    const reads = []
    const acks = []
    for (const action of queue) {
      if (action.type === 'read' && action.id) reads.push(action.id)
      if (action.type === 'ack' && action.id) acks.push(action.id)
      if (action.type === 'read_all' && Array.isArray(action.ids)) {
        reads.push(...action.ids)
      }
    }

    try {
      const token = getToken()
      await api.post(
        '/dashboard/notifications/state',
        { reads, acks },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      writeJson(QUEUE_KEY, [])
    } catch {
      // keep queue for retry
    }
  }

  function applyLocalStateToItems(serverItems) {
    const localState = getLocalState()
    const readSet = new Set(localState.reads || [])
    const ackSet = new Set(localState.acks || [])
    return serverItems.map(item => ({
      ...item,
      unread: !readSet.has(item.id) && item.unread !== false,
      acknowledged: ackSet.has(item.id) || !!item.acknowledged,
    }))
  }

  function markRead(id) {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, unread: false } : n)))
    const state = getLocalState()
    const reads = new Set(state.reads || [])
    reads.add(id)
    saveLocalState({ ...state, reads: [...reads] })
    queueSyncAction({ type: 'read', id })
  }

  function acknowledge(id) {
    setItems(prev =>
      prev.map(n => (n.id === id ? { ...n, unread: false, acknowledged: true } : n))
    )
    const state = getLocalState()
    const reads = new Set(state.reads || [])
    const acks = new Set(state.acks || [])
    reads.add(id)
    acks.add(id)
    saveLocalState({ ...state, reads: [...reads], acks: [...acks] })
    queueSyncAction({ type: 'read', id })
    queueSyncAction({ type: 'ack', id })
  }

  function openNotification(item) {
    markRead(item.id)
    const path = buildActionPath(item)
    if (path) {
      setOpen(false)
      navigate(path)
    }
  }

  async function loadNotifications() {
    try {
      const token = getToken()
      const [stateRes, notificationsRes] = await Promise.all([
        api.get('/dashboard/notifications/state', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get('/dashboard/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const serverState = {
        reads: stateRes.data?.readIds || [],
        acks: stateRes.data?.ackIds || [],
      }
      const localState = getLocalState()
      const mergedState = {
        reads: [...new Set([...(serverState.reads || []), ...(localState.reads || [])])],
        acks: [...new Set([...(serverState.acks || []), ...(localState.acks || [])])],
      }
      saveLocalState(mergedState)

      const mergedItems = applyLocalStateToItems(notificationsRes.data || [])
      const groupedItems = groupNotifications(mergedItems)
      setItems(groupedItems)
      writeJson(CACHE_KEY, groupedItems)
      setLastUpdatedAt(new Date().toISOString())

      const criticalUnread = new Set(
        groupedItems
          .filter(item => item.severity === 'critical' && item.unread)
          .map(item => item.id)
      )
      const nonCriticalUnread = new Set(
        groupedItems
          .filter(item => item.severity !== 'critical' && item.unread)
          .map(item => item.id)
      )
      const previous = previousCriticalUnreadIdsRef.current
      const hasNewCritical = [...criticalUnread].some(id => !previous.has(id))
      const previousNonCritical = previousNonCriticalUnreadIdsRef.current
      const hasNewNonCritical = [...nonCriticalUnread].some(id => !previousNonCritical.has(id))
      if (hasNewCritical && document.visibilityState === 'visible') {
        playCriticalNotificationSound()
      } else if (hasNewNonCritical && document.visibilityState === 'visible') {
        playStandardNotificationSound()
      }
      previousCriticalUnreadIdsRef.current = criticalUnread
      previousNonCriticalUnreadIdsRef.current = nonCriticalUnread
    } catch (err) {
      console.error('Failed to load notifications', err)
      const cached = readJson(CACHE_KEY, [])
      setItems(cached)
    }
  }

  useEffect(() => {
    const onClickOutside = event => {
      if (!panelRef.current) return
      if (!panelRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const onOnline = async () => {
      await flushSyncQueue()
      await loadNotifications()
    }

    document.addEventListener('mousedown', onClickOutside)
    window.addEventListener('online', onOnline)
    loadNotifications()

    const intervalId = setInterval(async () => {
      await flushSyncQueue()
      await loadNotifications()
    }, 30000)

    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('online', onOnline)
      clearInterval(intervalId)
    }
  }, [])

  async function markAllRead() {
    const ids = items.map(i => i.id)
    setItems(prev => prev.map(item => ({ ...item, unread: false })))
    const state = getLocalState()
    const reads = new Set([...(state.reads || []), ...ids])
    saveLocalState({ ...state, reads: [...reads] })
    queueSyncAction({ type: 'read_all', ids })
    toast.success('All notifications marked read')
    await flushSyncQueue()
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        className="relative p-2 rounded-lg hover:bg-[color:var(--bg-muted)] transition"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Notifications"
      >
        <IconBell className="text-[color:var(--text-muted)] hover:text-[color:var(--accent)] transition" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_10px_rgba(28,202,216,0.8)]" />
        )}
      </button>

      {(unreadBySeverity.critical > 0 || unreadBySeverity.warning > 0) && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1">
          {unreadBySeverity.critical > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] leading-none font-semibold">
              C{unreadBySeverity.critical}
            </span>
          )}
          {unreadBySeverity.warning > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] leading-none font-semibold">
              W{unreadBySeverity.warning}
            </span>
          )}
        </div>
      )}

      {open && (
        <div
          className="fixed left-3 right-3 top-20 max-h-[78vh] rounded-2xl border border-[color:var(--border)]
            bg-[color:var(--panel)] shadow-[var(--shadow)] overflow-hidden z-[100] backdrop-blur-xl
            transform origin-top-right transition-all
            sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 sm:max-h-none"
        >
          <div className="px-4 py-3 border-b border-[color:var(--border)] bg-[radial-gradient(circle_at_top_right,rgba(18,181,198,0.18),transparent_55%)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Notifications</p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {unreadCount} unread
                  {lastUpdatedAt ? ` · Updated ${new Date(lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                </p>
              </div>
              <button
                className="text-xs text-[color:var(--accent)] hover:text-[color:var(--accent-strong)] transition"
                onClick={markAllRead}
              >
                Mark all read
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'critical', label: 'Critical' },
                { id: 'warning', label: 'Warning' },
                { id: 'unread', label: 'Unread' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border transition whitespace-nowrap ${
                    filter === tab.id
                      ? 'border-[color:var(--accent)] text-[color:var(--accent)] bg-[color:var(--accent-soft)]'
                      : 'border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--text)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[calc(78vh-120px)] overflow-y-auto sm:max-h-96">
            {filteredItems.length === 0 && (
              <div className="px-4 py-8 text-center text-[color:var(--text-muted)] text-sm">
                No notifications in this view.
              </div>
            )}

            {filteredItems.map(item => (
              <div
                key={item.id}
                className={`mx-3 my-2 rounded-xl border px-3 py-3 transition ${getSeverityClasses(item.severity)} ${
                  item.unread ? 'ring-1 ring-[color:var(--accent)]/25' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5">{getTypeIcon(item.type)}</span>
                    <div>
                      <p className="text-sm font-semibold">
                        {item.title}
                        {item.aggregateCount > 1 && (
                          <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full bg-[color:var(--panel)] border border-[color:var(--border)]">
                            x{item.aggregateCount}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[color:var(--text-muted)] mt-1 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-[color:var(--text-muted)] whitespace-nowrap">
                    {formatTimeAgo(item.timeAgoMinutes || 0)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  {!item.acknowledged && (
                    <button
                      onClick={() => acknowledge(item.id)}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg
                        bg-[color:var(--panel)] border border-[color:var(--border)] hover:border-green-500
                        text-[color:var(--text)] hover:text-green-600 transition"
                    >
                      <IconCheck size={13} />
                      Acknowledge
                    </button>
                  )}

                  {item.action?.path && (
                    <button
                      onClick={() => openNotification(item)}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg
                        bg-[color:var(--panel)] border border-[color:var(--border)] hover:border-[color:var(--accent)]
                        text-[color:var(--text)] hover:text-[color:var(--accent)] transition"
                    >
                      {item.action?.label || 'Open'}
                      <IconChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
