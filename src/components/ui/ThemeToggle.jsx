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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <button
      onClick={() => {
        const next = !dark
        setDark(next)
        toast.success(`Switched to ${next ? 'dark' : 'light'} mode`)
      }}
      className="p-2 rounded-lg hover:bg-[color:var(--bg-muted)] transition"
      aria-label="Toggle theme"
    >
      {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  )
}
