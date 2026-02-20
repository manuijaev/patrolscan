import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const MANIFEST_CONFIG = {
  admin: {
    manifest: '/admin-manifest.json',
    themeColor: '#7c3aed',
    title: 'Patrolscan Admin',
    appleTitle: 'Patrolscan admin'
  },
  guard: {
    manifest: '/guard-manifest.json',
    themeColor: '#2563eb',
    title: 'Patrol Scan',
    appleTitle: 'PatrolScan'
  }
}

// Check if running as installed PWA and redirect to browser if needed
const checkPwaRedirect = (pathname) => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  
  if (!isStandalone) return false
  
  // Get the current PWA type from the manifest ID
  const manifestLink = document.querySelector('link[rel="manifest"]')
  const currentManifest = manifestLink?.getAttribute('href') || ''
  
  // If we're on admin PWA but trying to access guard routes
  if (currentManifest.includes('admin') && 
      (pathname.includes('guard') || pathname.includes('scan'))) {
    // Open guard login in browser with flag to force browser mode
    window.location.href = '/guard-login?browser=true'
    return true
  }
  
  // If we're on guard PWA but trying to access admin routes
  if (currentManifest.includes('guard') && pathname.includes('admin')) {
    // Open admin login in browser with flag to force browser mode
    window.location.href = '/admin-login?browser=true'
    return true
  }
  
  return false
}

export default function DynamicManifest() {
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname
    let config

    if (path.includes('admin')) {
      config = MANIFEST_CONFIG.admin
    } else {
      config = MANIFEST_CONFIG.guard
    }

    // Update manifest link
    const manifestLink = document.querySelector('link[rel="manifest"]')
    if (manifestLink) {
      manifestLink.setAttribute('href', config.manifest)
    }

    // Update theme color
    const themeColor = document.querySelector('meta[name="theme-color"]')
    if (themeColor) {
      themeColor.setAttribute('content', config.themeColor)
    }

    // Update Apple web app title
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if (appleTitle) {
      appleTitle.setAttribute('content', config.appleTitle)
    }

    // Update document title
    document.title = config.title

    // Check if we need to redirect to browser for the other PWA
    checkPwaRedirect(path)

  }, [location.pathname])

  return null
}
