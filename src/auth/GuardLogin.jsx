import { useState, useEffect, useCallback } from 'react'
import {
  IconShieldCheck,
  IconUser,
  IconAlertCircle,
  IconLoader2,
  IconCheck,
  IconNumber,
  IconBackspace,
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

  const submitLogin = useCallback(async () => {
    if (username.length < 2 || pin.length !== 4) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await api.post('/auth/guard/login', { username, pin })
      setSuccess(true)
      saveAuth(res.data.token, { role: 'guard', name: res.data.guardName })
      setTimeout(() => navigate('/scan'), 800)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or PIN')
      setPin('')
    } finally {
      setLoading(false)
    }
  }, [username, pin, navigate])

  // Auto-submit when PIN reaches 4 digits
  useEffect(() => {
    if (pin.length === 4 && username.length >= 2 && !loading) {
      submitLogin()
    }
  }, [pin, username, loading, submitLogin])

  // Handle keyboard input
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && pin.length === 4 && username.length >= 2 && !loading) {
      submitLogin()
    }
    if (e.key === 'Backspace' && pin.length > 0) {
      setPin(pin.slice(0, -1))
      setError('')
    }
  }, [pin, username, loading, submitLogin])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Handle PIN button clicks
  const handlePinDigit = (digit) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit)
      setError('')
    }
  }

  // Clear PIN
  const clearPin = () => {
    setPin('')
    setError('')
  }

  return (
    <LoginLayout
      title="Guard Access"
      subtitle="Enter your credentials to begin patrol"
      icon={<IconShieldCheck size={24} />}
      footer="Secure Patrol Access System"
    >
      <form className="space-y-5" onSubmit={e => { e.preventDefault(); submitLogin(); }}>
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 
            border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            <IconAlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 
            border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm">
            <IconCheck size={16} />
            <span>Access granted. Redirecting...</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wide">
            Username
          </label>
          <div className="relative group">
            <IconUser className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] 
              group-focus-within:text-[color:var(--accent)] transition-colors" size={20} />
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              className="w-full pl-11 pr-4 py-3 rounded-lg bg-[color:var(--bg-muted)]
                border border-[color:var(--border)] focus:outline-none focus:border-[color:var(--accent)]
                focus:ring-2 focus:ring-[color:var(--accent)]/20 transition-all text-sm
                placeholder:text-[color:var(--text-muted)]"
              disabled={loading || success}
              autoComplete="off"
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wide">
            4-Digit PIN
          </label>
          
          {/* PIN Dots Display */}
          <div className="flex justify-center gap-3 py-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200
                  ${pin.length > i 
                    ? 'bg-[color:var(--accent)] text-white shadow-lg shadow-[color:var(--accent)]/30' 
                    : 'bg-[color:var(--bg-muted)] border border-[color:var(--border)]'
                  }`}
              >
                {pin.length > i ? (
                  <IconCheck size={20} />
                ) : (
                  <IconNumber size={16} className="text-[color:var(--text-muted)]" />
                )}
              </div>
            ))}
          </div>
          
          {/* PIN Input */}
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => {
              const value = e.target.value.replace(/\D/g, '')
              if (value.length <= 4) {
                setPin(value)
                setError('')
              }
            }}
            className="text-center text-xl tracking-[0.5em] font-mono w-full py-3
              bg-[color:var(--bg-muted)] border border-[color:var(--border)] rounded-lg
              focus:outline-none focus:border-[color:var(--accent)] focus:ring-2 
              focus:ring-[color:var(--accent)]/20 transition-all
              placeholder:text-[color:var(--text-muted)]"
            placeholder="0000"
            disabled={loading || success}
            autoComplete="off"
          />
          
          {/* Quick PIN Buttons */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePinDigit(num.toString())}
                disabled={pin.length >= 4 || loading || success}
                className="py-3 rounded-lg bg-[color:var(--bg-muted)] border border-[color:var(--border)]
                  hover:bg-[color:var(--accent)] hover:text-white hover:border-[color:var(--accent)]
                  transition-all font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={clearPin}
              disabled={pin.length === 0 || loading || success}
              className="py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40
                transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <IconBackspace size={18} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={username.length < 2 || pin.length !== 4 || loading || success}
          className="w-full py-3 rounded-lg bg-[color:var(--accent)] text-white
            hover:bg-[color:var(--accent-strong)] transition-all font-medium text-sm
            disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
            shadow-lg shadow-[color:var(--accent)]/20"
        >
          {loading ? (
            <>
              <IconLoader2 size={18} className="animate-spin" />
              Verifying Credentials...
            </>
          ) : success ? (
            <>
              <IconCheck size={18} />
              Access Granted
            </>
          ) : (
            'Sign In to Patrol System'
          )}
        </button>
      </form>
    </LoginLayout>
  )
}
