import { useEffect, useMemo, useRef, useState } from 'react'
import { IconBell } from '@tabler/icons-react'
import { toast } from 'react-hot-toast'

const seedNotifications = [
  {
    id: 1,
    title: 'Checkpoint missed',
    detail: 'Gate A has no scan in 45 minutes.',
    time: '2m ago',
    unread: true,
  },
  {
    id: 2,
    title: 'Route completed',
    detail: 'Night Shift Route completed by Guard One.',
    time: '12m ago',
    unread: true,
  },
  {
    id: 3,
    title: 'Guard idle',
    detail: 'Guard Two has been idle for 25 minutes.',
    time: '34m ago',
    unread: false,
  },
]

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(seedNotifications)
  const panelRef = useRef(null)

  const unreadCount = useMemo(
    () => items.filter(item => item.unread).length,
    [items]
  )

  useEffect(() => {
    const onClickOutside = event => {
      if (!panelRef.current) return
      if (!panelRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function markAllRead() {
    setItems(prev =>
      prev.map(item => ({ ...item, unread: false }))
    )
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

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-2xl border border-[color:var(--border)]
            bg-[color:var(--panel)] shadow-[var(--shadow)] overflow-hidden z-[100]
            transform origin-top-right transition-all"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)]">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-[color:var(--text-muted)]">
                {unreadCount} unread
              </p>
            </div>
            <button
              className="text-xs text-[color:var(--accent)] hover:text-[color:var(--accent-strong)] transition"
              onClick={markAllRead}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.map(item => (
              <div
                key={item.id}
                className={`px-4 py-3 border-b border-[color:var(--border)] ${
                  item.unread
                    ? 'bg-[color:var(--bg-muted)]'
                    : 'bg-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{item.title}</p>
                  <span className="text-xs text-[color:var(--text-muted)]">
                    {item.time}
                  </span>
                </div>
                <p className="text-xs text-[color:var(--text-muted)] mt-1">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
