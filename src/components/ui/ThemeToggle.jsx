import { useEffect, useMemo, useState } from 'react'
import { IconMoon, IconSun } from '@tabler/icons-react'
import { toast } from 'react-hot-toast'

export default function ThemeToggle() {
  const prefersDark = useMemo(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches,
    []
  )
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return prefersDark
  })

  // Apply theme on mount and when dark changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  // Apply theme on initial load
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (stored === 'light') {
      document.documentElement.classList.remove('dark')
    } else if (prefersDark) {
      document.documentElement.classList.add('dark')
    }
  }, [prefersDark])

  return (
    <button
      onClick={() => {
        const next = !dark
        setDark(next)
        toast.success(`Switched to ${next ? 'dark' : 'light'} mode`)
      }}
      className="theme-toggle-pro"
      data-theme={dark ? 'dark' : 'light'}
      aria-label="Toggle theme"
      aria-pressed={dark}
    >
      <span className="theme-toggle-ring" />
      <span className="theme-toggle-core" />
      <span className="theme-toggle-particle theme-toggle-p1" />
      <span className="theme-toggle-particle theme-toggle-p2" />
      <span className="theme-toggle-particle theme-toggle-p3" />
      <span className="theme-toggle-icon-wrap">
        <IconSun size={17} className="theme-toggle-icon theme-toggle-sun" />
        <IconMoon size={17} className="theme-toggle-icon theme-toggle-moon" />
      </span>
    </button>
  )
}
