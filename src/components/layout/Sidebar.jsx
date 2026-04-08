import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  IconLayoutDashboard,
  IconUsers,
  IconMapPin,
  IconQrcode,
  IconAlertCircle,
  IconShieldCheck,
  IconLogout,
  IconX,
  IconCalendarTime,
  IconShield
} from '@tabler/icons-react'
import { logout, getToken, getUser } from '../../auth/authStore'
import api from '../../api/axios'

const baseMenu = [
  { name: 'Dashboard', path: '/dashboard', icon: IconLayoutDashboard },
  { name: 'Upcoming Patrols', path: '/upcoming-patrols', icon: IconCalendarTime },
  { name: 'Guards', path: '/guards', icon: IconUsers },
  { name: 'Checkpoints', path: '/checkpoints', icon: IconMapPin },
  { name: 'Patrols', path: '/patrols', icon: IconQrcode },
  { name: 'Incident & Reports', path: '/reports', icon: IconAlertCircle },
]
const INCIDENTS_SEEN_AT_KEY = 'admin_incidents_seen_at_v1'

export default function Sidebar({ variant = 'desktop', onClose }) {
  const location = useLocation()
  const [incidentCount, setIncidentCount] = useState(0)
  const user = getUser()
  const isSupervisor = user?.role === 'supervisor'
  const filteredBaseMenu = isSupervisor ? baseMenu.filter(item => item.path !== '/dashboard') : baseMenu
  const navMenu = isSupervisor
    ? [{ name: 'Supervisor Dashboard', path: '/supervisor-dashboard', icon: IconShield }, ...filteredBaseMenu]
    : baseMenu

  function getSeenAt() {
    return localStorage.getItem(INCIDENTS_SEEN_AT_KEY)
  }

  function setSeenAt(value) {
    if (!value) return
    localStorage.setItem(INCIDENTS_SEEN_AT_KEY, value)
  }

  useEffect(() => {
    let active = true

    if (location.pathname === '/reports') {
      setIncidentCount(0)
    }

    async function loadIncidentCount(markAsSeen = false) {
      try {
        const token = getToken()
        if (!token) return
        const res = await api.get('/incidents', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (active) {
          const items = Array.isArray(res.data) ? res.data : []
          const latestCreatedAt = items[0]?.createdAt || null

          if (markAsSeen) {
            if (latestCreatedAt) setSeenAt(latestCreatedAt)
            setIncidentCount(0)
            return
          }

          const seenAt = getSeenAt()
          if (!seenAt) {
            if (latestCreatedAt) setSeenAt(latestCreatedAt)
            setIncidentCount(0)
            return
          }

          const unseenCount = items.filter(incident => {
            if (!incident?.createdAt) return false
            return new Date(incident.createdAt) > new Date(seenAt)
          }).length
          setIncidentCount(unseenCount)
        }
      } catch {
        // silent fail in nav badge
      }
    }

    const onIncidentsChanged = () => loadIncidentCount()
    window.addEventListener('incidents:changed', onIncidentsChanged)
    loadIncidentCount(location.pathname === '/reports')
    const intervalId = setInterval(loadIncidentCount, 30000)

    return () => {
      active = false
      window.removeEventListener('incidents:changed', onIncidentsChanged)
      clearInterval(intervalId)
    }
  }, [location.pathname])

  function handleLogout() {
    logout()
    window.location.href = '/admin-login'
  }

  return (
    <aside
      className={`
        ${variant === 'desktop' ? 'hidden md:flex' : 'flex'}
        w-64 xl:w-72 bg-[color:var(--panel)]/90 backdrop-blur-xl
        border-r border-[color:var(--border)] flex-col
      `}
    >
      {/* Logo */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-3 text-[color:var(--accent)] font-semibold text-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[color:var(--accent-soft)] ring-1 ring-[color:var(--accent)]/30 shadow-[0_0_18px_rgba(28,202,216,0.25)]">
            <IconShieldCheck className="drop-shadow-[0_0_10px_rgba(28,202,216,0.6)]" />
          </div>
          <span className="whitespace-nowrap">PatrolScan</span>
        </div>
        {variant === 'mobile' && (
          <button
            type="button"
            onClick={onClose}
            className="ml-4 p-2 rounded-lg text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--bg-muted)] transition"
          >
            <IconX size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="px-4 space-y-2 mt-2">
        {navMenu.map(({ name, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `
              group flex items-center gap-3 w-full px-4 py-3 rounded-xl transition
              ${isActive
                ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/30'
                : 'text-[color:var(--text-muted)] hover:bg-[color:var(--bg-muted)] hover:text-[color:var(--text)]'}
              `
            }
          >
            <Icon
              size={20}
              className="group-hover:text-[color:var(--accent)] transition"
            />
            <span className="font-medium">{name}</span>
            {name === 'Incidents' && incidentCount > 0 && (
              <span
                className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white"
                aria-label={`${incidentCount} incidents`}
              >
                {incidentCount > 99 ? '99+' : incidentCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Logout Button */}
      <div className="p-4 border-t border-[color:var(--border)]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[color:var(--text-muted)] hover:bg-[color:var(--bg-muted)] hover:text-[color:var(--text)] transition"
        >
          <IconLogout size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>

      <div className="p-4 text-xs text-[color:var(--text-muted)]">
        © PatrolScan
      </div>
    </aside>
  )
}
