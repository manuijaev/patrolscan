import { IconUserCircle } from '@tabler/icons-react'
import ThemeToggle from '../ui/ThemeToggle'
import NotificationBell from '../ui/NotificationBell'

export default function Topbar() {
  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--panel)]/90 backdrop-blur-xl relative z-40">
      <h1 className="text-lg font-semibold tracking-wide">
        Dashboard
      </h1>

      <div className="flex items-center gap-5">
        <ThemeToggle />
        <NotificationBell />

        <IconUserCircle className="text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition" />
      </div>
    </header>
  )
}
