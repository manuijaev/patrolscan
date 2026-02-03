import { useState, useEffect } from 'react'
import {
  IconShieldCheck,
  IconUser,
  IconAlertCircle,
  IconLoader2,
} from '@tabler/icons-react'
import api from '../api/axios'
import { useNavigate } from 'react-router-dom'
import { saveAuth } from './authStore'
import LoginLayout from '../components/layout/LoginLayout'

export default function GuardLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function submitLogin() {
    if (username.length < 2 || pin.length !== 4) {
      setError('Please enter username and 4-digit PIN')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await api.post('/auth/guard/login', { username, pin })
      setSuccess(true)
      saveAuth(res.data.token, { role: 'guard', name: res.data.guardName })
      setTimeout(() => navigate('/scan'), 500)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or PIN')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (pin.length === 4 && username.length >= 2 && !loading) {
      submitLogin()
    }
  }, [pin])

  return (
    <LoginLayout
      title="Guard Access"
      subtitle="Enter your credentials"
      icon={<IconShieldCheck size={20} />}
      footer="PatrolScan secure guard access"
    >
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); submitLogin(); }}>
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 
            border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
            <IconAlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 
            border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-xs">
            <IconShieldCheck size={14} />
            <span>Access granted</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-left text-xs font-medium text-[color:var(--text-muted)]">
            Username
          </label>
          <div className="relative group">
            <IconUser className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] 
              group-focus-within:text-[color:var(--accent)] transition-colors" size={18} />
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[color:var(--bg-muted)]
                border border-[color:var(--border)] focus:outline-none focus:border-[color:var(--accent)]
                focus:ring-2 focus:ring-[color:var(--accent)]/20 transition-all text-sm"
              disabled={loading || success}
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-left text-xs font-medium text-[color:var(--text-muted)]">
            PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => {
              const value = e.target.value.replace(/\D/g, '')
              setPin(value)
              setError('')
            }}
            className="text-center text-2xl tracking-[0.6em] font-mono w-full py-2
              bg-[color:var(--bg-muted)] border border-[color:var(--border)] rounded-lg
              focus:outline-none focus:border-[color:var(--accent)] focus:ring-2 
              focus:ring-[color:var(--accent)]/20 transition-all"
            placeholder="0000"
            disabled={loading || success}
          />
        </div>

        <div className="flex justify-center gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200
                ${pin.length >= i 
                  ? 'bg-[color:var(--accent)]' 
                  : 'bg-[color:var(--border)]'
                }`}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={username.length < 2 || pin.length !== 4 || loading || success}
          className="w-full py-2 rounded-lg bg-[color:var(--accent)] text-white
            hover:bg-[color:var(--accent-strong)] transition-all font-medium text-sm
            disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              Verifying...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
    </LoginLayout>
  )
}
