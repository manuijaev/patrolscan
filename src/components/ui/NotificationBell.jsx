import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  IconAlertTriangle,
  IconBell,
  IconCheck,
  IconChevronRight,
  IconCircleCheck,
  IconShieldLock,
  IconTargetArrow,
  IconTrash
} from '@tabler/icons-react'
import { toast } from 'react-hot-toast'
import api from '../../api/axios'
import { getToken } from '../../auth/authStore'

const CACHE_KEY = 'admin_notifications_cache_v3'
const STATE_KEY = 'admin_notifications_state_v3'
const QUEUE_KEY = 'admin_notifications_sync_queue_v3'
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
    // ignore
  }
}

function formatTimeAgo(timeAgoMinutes) {
  if (timeAgoMinutes <= 0) return 'Just now'
  if (timeAgoMinutes < 60) return `${timeAgoMinutes}m ago`
  const hours = Math.floor(timeAgoMinutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(() => readJson(CACHE_KEY, []))
  const [filter, setFilter] = useState('all')
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const panelRef = useRef(null)
  const previousUnreadIdsRef = useRef(new Set())
  const criticalAudioRef = useRef(null)
  const standardAudioRef = useRef(null)

  const unreadCount = useMemo(
    () => items.filter(item => item.unread).length,
    [items]
  )

  const unreadBySeverity = useMemo(() => {
    return {
      critical: items.filter(i => i.unread && i.severity === 'critical').length,
      warning: items.filter(i => i.unread && i.severity === 'warning').length,
      other: items.filter(i => i.unread && i.severity === 'other').length,
    }
  }, [items])

  const filteredItems = useMemo(() => {
    if (filter === 'unread') return items.filter(item => item.unread)
    if (filter === 'critical') return items.filter(item => item.severity === 'critical')
    if (filter === 'warning') return items.filter(item => item.severity === 'warning')
    if (filter === 'other') return items.filter(item => item.severity === 'other')
    return items
  }, [items, filter])

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
    if (type === 'successful_scan') return <IconCircleCheck size={15} className="text-green-500" />
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
        gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
        osc.start(start)
        osc.stop(start + duration + 0.02)
      }
      tone(880, now + 0.01, 0.12, 0.08)
      tone(1175, now + 0.16, 0.14, 0.07)
      setTimeout(() => ctx.close().catch(() => {}), 550)
    } catch {
      // no-op
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
      osc.frequency.value = 720
      gain.gain.value = 0.0001
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1)
      osc.start(now + 0.01)
      osc.stop(now + 0.11)
      setTimeout(() => ctx.close().catch(() => {}), 250)
    } catch {
      // no-op
    }
  }

  function playCriticalNotificationSound() {
    try {
      const audio = criticalAudioRef.current
      if (!audio) return playCriticalFallbackTone()
      audio.currentTime = 0
      audio.volume = 0.8
      audio.play().catch(() => playCriticalFallbackTone())
    } catch {
      playCriticalFallbackTone()
    }
  }

  function playStandardNotificationSound() {
    try {
      const audio = standardAudioRef.current
      if (!audio) return playStandardFallbackTone()
      audio.currentTime = 0
      audio.volume = 0.55
      audio.play().catch(() => playStandardFallbackTone())
    } catch {
      playStandardFallbackTone()
    }
  }

  function getLocalState() {
    return readJson(STATE_KEY, { reads: [], acks: [], deletedIds: [], resetAt: null })
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
    if (!queue.length || !navigator.onLine) return

    const reads = []
    const acks = []
    const deletes = []
    let shouldResetAll = false
    for (const action of queue) {
      if (action.type === 'read' && action.id) reads.push(action.id)
      if (action.type === 'ack' && action.id) acks.push(action.id)
       if (action.type === 'delete' && action.id) deletes.push(action.id)
      if (action.type === 'read_all' && Array.isArray(action.ids)) {
        reads.push(...action.ids)
      }
      if (action.type === 'reset_all') shouldResetAll = true
    }

    try {
      const token = getToken()
      await api.post(
        '/dashboard/notifications/state',
        { reads, acks, deletes, resetAll: shouldResetAll },
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
    const deletedSet = new Set(localState.deletedIds || [])
    const resetAt = localState.resetAt ? new Date(localState.resetAt) : null
    return serverItems
      .filter(item => {
        if (deletedSet.has(item.id)) return false
        if (resetAt && new Date(item.time) <= resetAt) return false
        return true
      })
      .map(item => ({
        ...item,
        unread: !readSet.has(item.id) && item.unread !== false,
        acknowledged: ackSet.has(item.id) || !!item.acknowledged,
      }))
  }

  function markIdsRead(ids, syncNow = false) {
    if (!ids.length) return
    setItems(prev => prev.map(item => (ids.includes(item.id) ? { ...item, unread: false } : item)))
    const state = getLocalState()
    const reads = new Set(state.reads || [])
    ids.forEach(id => reads.add(id))
    saveLocalState({ ...state, reads: [...reads] })
    queueSyncAction({ type: 'read_all', ids })
    if (syncNow) {
      flushSyncQueue()
    }
  }

  function acknowledge(itemId) {
    setItems(prev =>
      prev.map(n => (n.id === itemId ? { ...n, unread: false, acknowledged: true } : n))
    )
    const state = getLocalState()
    const reads = new Set(state.reads || [])
    const acks = new Set(state.acks || [])
    reads.add(itemId)
    acks.add(itemId)
    saveLocalState({ ...state, reads: [...reads], acks: [...acks] })
    queueSyncAction({ type: 'read', id: itemId })
    queueSyncAction({ type: 'ack', id: itemId })
    setOpen(false)
    flushSyncQueue()
  }

  function deleteNotification(itemId) {
    setItems(prev => prev.filter(item => item.id !== itemId))
    const state = getLocalState()
    const reads = new Set(state.reads || [])
    const acks = new Set(state.acks || [])
    const deletedIds = new Set(state.deletedIds || [])
    reads.add(itemId)
    acks.add(itemId)
    deletedIds.add(itemId)
    saveLocalState({
      ...state,
      reads: [...reads],
      acks: [...acks],
      deletedIds: [...deletedIds],
    })
    queueSyncAction({ type: 'delete', id: itemId })
    flushSyncQueue()
  }

  function resetNotifications() {
    const nowIso = new Date().toISOString()
    setItems([])
    const state = getLocalState()
    saveLocalState({
      ...state,
      reads: [],
      acks: [],
      deletedIds: [],
      resetAt: nowIso,
    })
    queueSyncAction({ type: 'reset_all' })
    setOpen(false)
    flushSyncQueue()
    toast.success('Notifications reset')
  }

  function openNotification(item) {
    markIdsRead([item.id], true)
    const path = buildActionPath(item)
    if (path) {
      setOpen(false)
      navigate(path)
    }
  }

  function showIncomingPopup(item) {
    const toastId = `incoming-${item.id}`
    toast.custom(
      () => (
        <button
          onClick={() => {
            toast.dismiss(toastId)
            setOpen(true)
            setFilter('all')
          }}
          className={`w-[min(92vw,420px)] rounded-xl border px-4 py-3 text-left shadow-[var(--shadow)] bg-[color:var(--panel)] transition ${getSeverityClasses(item.severity)}`}
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5">{getTypeIcon(item.type)}</span>
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-[color:var(--text-muted)] mt-1 line-clamp-2">{item.detail}</p>
            </div>
          </div>
        </button>
      ),
      { id: toastId, duration: 1000 }
    )
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
        deletedIds: stateRes.data?.deletedIds || [],
        resetAt: stateRes.data?.resetAt || null,
      }
      const localState = getLocalState()
      const serverReset = serverState.resetAt ? new Date(serverState.resetAt).getTime() : 0
      const localReset = localState.resetAt ? new Date(localState.resetAt).getTime() : 0
      const mergedResetAt = serverReset >= localReset ? serverState.resetAt : localState.resetAt
      const mergedState = {
        reads: [...new Set([...(serverState.reads || []), ...(localState.reads || [])])],
        acks: [...new Set([...(serverState.acks || []), ...(localState.acks || [])])],
        deletedIds: [...new Set([...(serverState.deletedIds || []), ...(localState.deletedIds || [])])],
        resetAt: mergedResetAt || null,
      }
      saveLocalState(mergedState)

      const mergedItems = applyLocalStateToItems(notificationsRes.data || [])
      const groupedItems = groupNotifications(mergedItems)
      setItems(groupedItems)
      writeJson(CACHE_KEY, groupedItems)
      setLastUpdatedAt(new Date().toISOString())

      const unreadIds = new Set(groupedItems.filter(item => item.unread).map(item => item.id))
      const previousUnread = previousUnreadIdsRef.current
      const newItems = groupedItems.filter(item => item.unread && !previousUnread.has(item.id))
      const hasNewCritical = newItems.some(item => item.severity === 'critical')
      const hasNewNonCritical = newItems.some(item => item.severity !== 'critical')

      if (hasNewCritical) {
        playCriticalNotificationSound()
      } else if (hasNewNonCritical) {
        playStandardNotificationSound()
      }

      if (location.pathname === '/dashboard' && newItems.length > 0) {
        newItems.forEach(showIncomingPopup)
      }

      previousUnreadIdsRef.current = unreadIds
    } catch (err) {
      console.error('Failed to load notifications', err)
      const cached = readJson(CACHE_KEY, [])
      setItems(cached)
    }
  }

  useEffect(() => {
    criticalAudioRef.current = new Audio(CRITICAL_SOUND_URL)
    standardAudioRef.current = new Audio(STANDARD_SOUND_URL)
    criticalAudioRef.current.preload = 'auto'
    standardAudioRef.current.preload = 'auto'
    criticalAudioRef.current.load()
    standardAudioRef.current.load()

    const unlockAudio = () => {
      const attempt = audio => {
        if (!audio) return
        const wasMuted = audio.muted
        audio.muted = true
        audio.play()
          .then(() => {
            audio.pause()
            audio.currentTime = 0
            audio.muted = wasMuted
          })
          .catch(() => {
            audio.muted = wasMuted
          })
      }
      attempt(criticalAudioRef.current)
      attempt(standardAudioRef.current)
      window.removeEventListener('touchstart', unlockAudio)
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }

    window.addEventListener('touchstart', unlockAudio, { once: true })
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })

    return () => {
      window.removeEventListener('touchstart', unlockAudio)
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
  }, [])

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
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const unreadVisibleIds = filteredItems.filter(item => item.unread).map(item => item.id)
    if (unreadVisibleIds.length > 0) {
      markIdsRead(unreadVisibleIds, true)
    }
  }, [open, filter, filteredItems])

  async function markAllRead() {
    const ids = items.map(i => i.id)
    markIdsRead(ids, true)
    toast.success('All notifications marked read')
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

      {(unreadBySeverity.critical > 0 || unreadBySeverity.warning > 0 || unreadBySeverity.other > 0) && (
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
          {unreadBySeverity.other > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] leading-none font-semibold">
              O{unreadBySeverity.other}
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
              <button
                className="ml-2 text-xs text-red-500 hover:text-red-600 transition"
                onClick={resetNotifications}
              >
                Reset all
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'critical', label: 'Critical' },
                { id: 'warning', label: 'Warning' },
                { id: 'other', label: 'Other' },
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

                  <button
                    onClick={() => deleteNotification(item.id)}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg
                      bg-[color:var(--panel)] border border-[color:var(--border)] hover:border-red-500
                      text-[color:var(--text)] hover:text-red-600 transition"
                  >
                    <IconTrash size={13} />
                    Delete
                  </button>

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
