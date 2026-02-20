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

  }, [location.pathname])

  return null
}
