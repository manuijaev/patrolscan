// components/layout/LoginLayout.jsx
import { useState, useEffect } from 'react'

export default function LoginLayout({
  title,
  subtitle,
  icon,
  children,
  footer,
}) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 
      bg-gray-50 dark:bg-gray-950 transition-all duration-500 
      ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Card */}
      <div className={`w-full max-w-md relative z-10 transition-all duration-700 
        ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 
          rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
          
          {/* Decorative top accent */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-24 h-1 
            bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative mx-auto w-14 h-14 mb-4">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 
                opacity-20" />
              <div className="relative rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 
                p-3 text-white flex items-center justify-center">
                {icon}
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form Content */}
          <div className="space-y-5">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700/50 
              text-center text-xs text-gray-500 dark:text-gray-400">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}