// components/layout/LoginLayout.jsx
import { useState, useEffect } from 'react'

export default function LoginLayout({
  title,
  subtitle,
  icon,
  children,
  footer,
  transitionClass = '',
}) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Ensure saved theme is applied on login screens too
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (stored === 'light') {
      document.documentElement.classList.remove('dark')
    } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  return (
    <div className={`login-shell min-h-screen flex items-center justify-center p-4 
      bg-[color:var(--bg)] transition-all duration-500 
      ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="login-grid-overlay" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[color:var(--accent-soft)] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[color:var(--accent-soft)] rounded-full blur-3xl" />
      </div>

      {/* Main Card */}
      <div className={`login-card w-full max-w-md relative z-10 transition-all duration-700 ${transitionClass}
        ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="login-card-pro rounded-2xl p-8 transition-shadow duration-300">
          
          {/* Decorative top accent */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-24 h-1 
            bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] rounded-full" />
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="login-icon-wrap relative mx-auto w-14 h-14 mb-4">
              <div className="login-icon-orbit absolute inset-0 rounded-xl bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-strong)] 
                opacity-20" />
              <div className="login-icon-core relative rounded-xl bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-strong)] 
                p-3 text-white flex items-center justify-center">
                {icon}
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-[color:var(--text)]">
              {title}
            </h1>
            
            {subtitle && (
              <p className="text-sm text-[color:var(--text-muted)] mt-2">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form Content */}
          <div className="space-y-5 login-form">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="mt-8 pt-6 border-t border-[color:var(--border)] 
              text-center text-xs text-[color:var(--text-muted)]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
