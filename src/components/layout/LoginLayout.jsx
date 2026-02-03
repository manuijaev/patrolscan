// components/layout/EnhancedLoginLayout.jsx
import { useState, useEffect } from 'react'

export default function EnhancedLoginLayout({
  title,
  subtitle,
  icon,
  children,
  footer,
  variant = 'default', // 'default', 'minimal', 'glass', 'gradient'
  theme = 'light', // 'light', 'dark', 'auto'
}) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Theme-based gradient backgrounds
  const gradientVariants = {
    light: 'from-blue-50 via-white to-purple-50',
    dark: 'from-gray-900 via-gray-800 to-blue-900',
    auto: 'from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900'
  }

  // Layout variants
  const layoutConfig = {
    default: {
      card: 'bg-white dark:bg-gray-900 backdrop-blur-xl border border-gray-200 dark:border-gray-700',
      width: 'max-w-md',
      padding: 'p-8',
    },
    minimal: {
      card: 'bg-transparent backdrop-blur-lg border-0',
      width: 'max-w-sm',
      padding: 'p-6',
    },
    glass: {
      card: 'bg-white/20 dark:bg-gray-900/20 backdrop-blur-2xl border border-white/30 dark:border-gray-700/30',
      width: 'max-w-md',
      padding: 'p-8',
    },
    gradient: {
      card: 'bg-gradient-to-br from-white/90 to-blue-50/90 dark:from-gray-900/90 dark:to-blue-900/90 backdrop-blur-xl border border-white/40 dark:border-gray-700/40',
      width: 'max-w-md',
      padding: 'p-8',
    }
  }

  const config = layoutConfig[variant]

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 
      transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}
      ${variant === 'glass' || variant === 'gradient' 
        ? `bg-gradient-to-br ${gradientVariants[theme]}`
        : 'bg-gray-50 dark:bg-gray-950'
      }`}>
      
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-blue-500/10 dark:bg-blue-400/10"
              style={{
                width: Math.random() * 100 + 50,
                height: Math.random() * 100 + 50,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${15 + Math.random() * 20}s infinite ease-in-out`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>

        {/* Animated Gradient Orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Main Card Container - Centered with constraints */}
      <div className={`${config.width} w-full mx-auto relative z-10`}>
        {/* Card with subtle animation */}
        <div className={`
          ${config.card}
          ${config.padding}
          rounded-2xl
          shadow-2xl
          transform
          transition-all
          duration-700
          ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
          hover:shadow-3xl
          hover:scale-[1.02]
          transition-all
          duration-300
        `}>
          
          {/* Decorative top accent */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-24 h-1 
            bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
          
          {/* Header Section */}
          <div className="text-center space-y-4 mb-8">
            <div className="relative">
              {/* Icon with animated ring */}
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 
                  opacity-20 animate-pulse" />
                <div className="relative rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 
                  p-3 text-white shadow-lg transform transition-transform hover:scale-110">
                  {icon}
                </div>
                {mounted && (
                  <div className="absolute -inset-2 rounded-2xl border-2 border-blue-500/30 
                    animate-[spin_3s_linear_infinite]" />
                )}
              </div>
              
              {/* Title with gradient */}
              <h1 className="mt-6 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                {title}
              </h1>
              
              {/* Subtitle */}
              {subtitle && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-xs mx-auto">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="space-y-6">
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

        {/* Floating action indicator */}
        {mounted && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 
            animate-bounce">
            ↓
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}