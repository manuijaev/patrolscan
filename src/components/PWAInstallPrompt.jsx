import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'

const PWA_CONFIG = {
  admin: {
    name: 'Patrolscan Admin',
    shortName: 'Patrolscan admin',
    themeColor: '#7c3aed',
    description: 'Install the Admin Portal on your home screen for quick access.',
    icon: '/patrolscanimg.png',
    storageKey: 'adminPwaPromptDismissed'
  },
  guard: {
    name: 'Patrol Scan',
    shortName: 'PatrolScan',
    themeColor: '#2563eb',
    description: 'Install this app on your home screen for quick access and offline functionality.',
    icon: '/patrolscanimg.png',
    storageKey: 'guardPwaPromptDismissed'
  }
}

export default function PWAInstallPrompt() {
  const location = useLocation()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [pwaType, setPwaType] = useState('guard')

  // Determine PWA type based on current route
  const determinePwaType = useCallback(() => {
    const path = location.pathname
    if (path.includes('admin') || path === '/') {
      return 'admin'
    }
    return 'guard'
  }, [location.pathname])

  useEffect(() => {
    const type = determinePwaType()
    setPwaType(type)
    
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [determinePwaType])

  const config = PWA_CONFIG[pwaType]

  const handleInstall = async () => {
    if (!deferredPrompt) return
    
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log(`User accepted the ${pwaType} PWA install prompt`)
    } else {
      console.log(`User dismissed the ${pwaType} PWA install prompt`)
    }
    
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleClose = () => {
    setShowPrompt(false)
    localStorage.setItem(config.storageKey, 'true')
  }

  if (!showPrompt || localStorage.getItem(config.storageKey)) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 p-4">
      <div className="flex items-start gap-3">
        <img 
          src={config.icon} 
          alt={config.name} 
          className="w-12 h-12 rounded-lg flex-shrink-0 object-contain"
          style={{ borderColor: config.themeColor, borderWidth: '2px' }}
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">Install {config.shortName}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {config.description}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex-1 py-2 rounded-lg text-white font-medium text-sm transition"
              style={{ backgroundColor: config.themeColor }}
              onMouseOver={(e) => e.target.style.backgroundColor = pwaType === 'admin' ? '#6d28d9' : '#1d4ed8'}
              onMouseOut={(e) => e.target.style.backgroundColor = config.themeColor}
            >
              Install App
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm transition"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
