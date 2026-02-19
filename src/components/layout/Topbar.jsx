import { IconUserCircle, IconMenu2 } from '@tabler/icons-react'
import ThemeToggle from '../ui/ThemeToggle'
import NotificationBell from '../ui/NotificationBell'

export default function Topbar({ onToggleSidebar }) {
  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--panel)]/90 backdrop-blur-xl relative z-40">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden inline-flex items-center justify-center p-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-muted)] text-[color:var(--text)] hover:bg-[color:var(--panel)] transition"
          aria-label="Open navigation"
        >
          <IconMenu2 size={18} />
        </button>
        <h1 className="text-lg font-semibold tracking-wide">
          Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-5">
        <ThemeToggle />
        <NotificationBell />

        <IconUserCircle className="text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition" />
      </div>
    </header>
  )
}
