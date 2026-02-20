import { NavLink } from 'react-router-dom'
import {
  IconLayoutDashboard,
  IconUsers,
  IconMapPin,
  IconQrcode,
  IconReportAnalytics,
  IconShieldCheck,
  IconLogout,
  IconX,
  IconCalendarTime
} from '@tabler/icons-react'
import { logout } from '../../auth/authStore'

const menu = [
  { name: 'Dashboard', path: '/dashboard', icon: IconLayoutDashboard },
  { name: 'Upcoming Patrols', path: '/upcoming-patrols', icon: IconCalendarTime },
  { name: 'Guards', path: '/guards', icon: IconUsers },
  { name: 'Checkpoints', path: '/checkpoints', icon: IconMapPin },
  { name: 'Patrols', path: '/patrols', icon: IconQrcode },
  { name: 'Reports', path: '/reports', icon: IconReportAnalytics },
]

export default function Sidebar({ variant = 'desktop', onClose }) {

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
        {menu.map(({ name, path, icon: Icon }) => (
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
