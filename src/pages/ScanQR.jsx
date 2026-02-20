import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Toaster, toast } from 'react-hot-toast'
import {
  IconCamera,
  IconCheck,
  IconMapPin,
  IconHistory,
  IconClock,
  IconQrcode,
  IconScan,
  IconLoader2,
  IconAlertCircle,
  IconRefresh,
  IconLocation,
  IconCameraOff,
  IconShieldCheck,
  IconX,
  IconMoon,
  IconSun,
  IconArrowLeft,
  IconEye
} from '@tabler/icons-react'
import api from '../api/axios'
import { saveOfflineScan } from '../offline/db'
import { getToken, getUser } from '../auth/authStore'

const CHECKPOINT_COOLDOWN_MS = 120000 // 2 minutes per checkpoint
const FAIL_COOLDOWN_MS = 10000 // 10 seconds for failed scans
const MAX_PROCESSING_TIME = 10000 // 10 seconds max processing time

export default function ScanQR() {
  const qrRef = useRef(null)
  const scannerRef = useRef(null)
  const [lastScans, setLastScans] = useState([])
  const [showPatrolHistory, setShowPatrolHistory] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [cameraError, setCameraError] = useState(false)
  const [scanState, setScanState] = useState('idle') // 'idle', 'detected', 'processing', 'success', 'failed'
  const [currentCheckpoint, setCurrentCheckpoint] = useState(null)
  const [cooldownTime, setCooldownTime] = useState(0)
  const [showTick, setShowTick] = useState(false)
  const [showCross, setShowCross] = useState(false)

  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
  })

  const user = getUser()
  const cooldownTimerRef = useRef(null)
  const processingTimeoutRef = useRef(null)
  const safetyTimeoutRef = useRef(null)
  const lastScannedQrRef = useRef('') // Track last scanned QR to prevent duplicates
  const scanCompletedRef = useRef(false) // Prevent duplicate completeScan calls
  const wasOnlineRef = useRef(true) // Track previous online status to prevent duplicate toasts
  const [activeCooldownCheckpoint, setActiveCooldownCheckpoint] = useState(null) // Track which checkpoint is in cooldown
  const isFirstMount = useRef(true)

  // Theme toggle effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Apply theme on initial load
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (stored === 'light') {
      document.documentElement.classList.remove('dark')
    } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
    }
    const handleOffline = () => {
      setIsOnline(false)
      toast.warning('Offline mode')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current)
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
      stopScanner()
    }
  }, [])

  // Load recent scans and location on mount
  useEffect(() => {
    getLocation()
    
    // Restore cooldown state from localStorage
    const activeCheckpointId = localStorage.getItem('activeCooldownCheckpoint')
    const scanResult = localStorage.getItem('scanResult') // 'success' or 'failed'
    const scanTimestamp = localStorage.getItem('scanTimestamp') // When scan was recorded
    
    if (activeCheckpointId && scanTimestamp) {
      const lastScanTime = parseInt(scanTimestamp)
      const elapsed = Date.now() - lastScanTime
      const remaining = CHECKPOINT_COOLDOWN_MS - elapsed
      
      if (remaining > 0) {
        // Still in cooldown - show cooldown UI only, don't refetch scans
        setScanState('cooldown') // Block scanner during cooldown
        setCooldownTime(Math.ceil(remaining / 1000))
        setActiveCooldownCheckpoint(activeCheckpointId)
        
        // Start inline cooldown timer
        const endTime = Date.now() + remaining
        cooldownTimerRef.current = setInterval(() => {
          const secsRemaining = Math.ceil((endTime - Date.now()) / 1000)
          setCooldownTime(secsRemaining)
          if (secsRemaining <= 0) {
            clearInterval(cooldownTimerRef.current)
            setScanState('idle') // Scanner will restart only when manually restarted
            setCooldownTime(0)
            setActiveCooldownCheckpoint(null)
            localStorage.removeItem('activeCooldownCheckpoint')
            localStorage.removeItem('scanResult')
            localStorage.removeItem('scanTimestamp')
            lastScannedQrRef.current = ''
          }
        }, 1000)
        
        // Load scans in background but don't block
        loadRecentScans()
      } else {
        // Cooldown expired while away - clear all
        localStorage.removeItem('activeCooldownCheckpoint')
        localStorage.removeItem('scanResult')
        localStorage.removeItem('scanTimestamp')
        loadRecentScans()
      }
    } else {
      // No active cooldown - load scans normally
      loadRecentScans()
    }
  }, [])

  async function getLocation() {
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          })
        })
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      } catch (err) {
        console.log('Location not available:', err)
      }
    }
  }

  async function loadRecentScans() {
    // First try to load from localStorage for persistence when logged out
    const storedScans = localStorage.getItem('recentScans')
    let localScans = []
    if (storedScans) {
      try {
        localScans = JSON.parse(storedScans)
      } catch (e) {
        console.error('Failed to parse stored scans', e)
      }
    }
    
    try {
      const token = getToken()
      const res = await api.get('/scans/my-scans', {
        headers: { Authorization: `Bearer ${token}` },
      })
      // Merge API scans with local scans, remove duplicates
      const apiScans = res.data || []
      const allScans = [...apiScans, ...localScans]
      // Remove duplicates based on timestamp
      const uniqueScans = allScans.filter((scan, index, self) => 
        index === self.findIndex((s) => s.timestamp === scan.timestamp)
      )
      setLastScans(uniqueScans.slice(0, 5))
    } catch (err) {
      console.error('Failed to load scans', err)
      // Fall back to localStorage only
      setLastScans(localScans.slice(0, 5))
    }
  }

  // Save scan to localStorage for persistence
  function saveScanToLocalStorage(scan) {
    const storedScans = localStorage.getItem('recentScans')
    let scans = []
    if (storedScans) {
      try {
        scans = JSON.parse(storedScans)
      } catch (e) {
        scans = []
      }
    }
    // Add new scan at the beginning
    scans.unshift(scan)
    // Keep only last 50 scans
    scans = scans.slice(0, 50)
    localStorage.setItem('recentScans', JSON.stringify(scans))
  }

  // Stop scanner
  const stopScanner = useCallback(async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop()
      } catch (err) {
        console.log('Scanner stop error:', err)
      }
    }
  }, [])

  // Start scanner
  const startScanner = useCallback(async () => {
    if (!qrRef.current || scanState !== 'idle') return
    
    try {
      const devices = await Html5Qrcode.getCameras()
      if (devices.length === 0) {
        setCameraError(true)
        toast.error('No camera found')
        return
      }

      const backCamera = devices.find(d => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      ) || devices[0]

      scannerRef.current = new Html5Qrcode('qr-reader')

      await scannerRef.current.start(
        backCamera.id,
        { 
          fps: 10, 
          qrbox: { 
            width: Math.min(250, window.innerWidth - 100),
            height: Math.min(250, window.innerWidth - 100)
          },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          // Prevent processing if already scanning or if it's the same QR
          if (scanState !== 'idle' || lastScannedQrRef.current === decodedText) return
          
          lastScannedQrRef.current = decodedText
          await stopScanner()
          handleScan(decodedText)
        },
        () => {} // Ignore errors
      )

      setCameraError(false)
    } catch (err) {
      console.error('Camera initialization error:', err)
      setCameraError(true)
      toast.error('Failed to start camera')
    }
  }, [scanState, stopScanner])

  // Initialize scanner when idle
  useEffect(() => {
    // Skip on first mount - let cooldown restore logic handle it
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    
    if (scanState === 'idle' && !cameraError) {
      startScanner()
    }

    return () => {
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current)
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
    }
  }, [scanState, cameraError, startScanner])

  // Start cooldown timer
  const startCooldown = useCallback((duration, checkpointId = null) => {
    const endTime = Date.now() + duration
    setCooldownTime(Math.ceil(duration / 1000))
    setScanState('cooldown') // Block scanner during cooldown

    if (checkpointId) {
      setActiveCooldownCheckpoint(checkpointId)
      localStorage.setItem('activeCooldownCheckpoint', checkpointId)
    }

    cooldownTimerRef.current = setInterval(() => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000)
      setCooldownTime(remaining)

      if (remaining <= 0) {
        clearInterval(cooldownTimerRef.current)
        setScanState('idle')
        setShowTick(false)
        setShowCross(false)
        setActiveCooldownCheckpoint(null)
        localStorage.removeItem('activeCooldownCheckpoint')
        lastScannedQrRef.current = ''
      }
    }, 1000)
  }, [])

  // Handle QR scan with 5-second timeout
  const handleScan = async (decodedText) => {
    // Reset scan completed flag for new scan
    scanCompletedRef.current = false
    setScanState('processing')

    // Set safety timeout - automatically resolve after 5 seconds
    safetyTimeoutRef.current = setTimeout(() => {
      // Prevent duplicate calls
      if (scanCompletedRef.current || scanState !== 'processing') return
      
      console.log('Processing timeout - auto-resolving')
      // Determine success/failure based on QR validity
      try {
        const qrData = JSON.parse(decodedText)
        if (qrData.type === 'patrol-checkpoint' && qrData.id) {
          // Valid QR - show success
          completeScan(true, qrData.id, qrData.checkpointName || qrData.name)
        } else {
          // Invalid QR - show failure
          completeScan(false)
        }
      } catch {
        // Invalid JSON - show failure
        completeScan(false)
      }
    }, MAX_PROCESSING_TIME)

    try {
      let qrData
      try {
        qrData = JSON.parse(decodedText)
      } catch {
        clearTimeout(safetyTimeoutRef.current)
        completeScan(false)
        return
      }

      if (qrData.type !== 'patrol-checkpoint' || !qrData.id) {
        clearTimeout(safetyTimeoutRef.current)
        completeScan(false)
        return
      }

      const checkpointId = qrData.id
      const checkpointName = qrData.checkpointName || qrData.name || 'Unknown Checkpoint'
      const designatedUser = qrData.designatedUser || qrData.guardName || null

      setCurrentCheckpoint({
        id: checkpointId,
        name: checkpointName
      })

      // Check checkpoint cooldown using timestamp
      const scanTimestamp = localStorage.getItem('scanTimestamp')
      if (scanTimestamp) {
        const elapsed = Date.now() - parseInt(scanTimestamp)
        if (elapsed < CHECKPOINT_COOLDOWN_MS) {
          const remaining = Math.ceil((CHECKPOINT_COOLDOWN_MS - elapsed) / 1000)
          clearTimeout(safetyTimeoutRef.current)
          toast.error(`Please wait ${remaining}s before scanning again`)
          // Don't show tick/cross, just reject
          return
        }
      }

      // Clear safety timeout since we're handling it
      clearTimeout(safetyTimeoutRef.current)
      
      // Process the scan
      await processScan(checkpointId, checkpointName, designatedUser)

    } catch (error) {
      console.error('Scan error:', error)
      clearTimeout(safetyTimeoutRef.current)
      completeScan(false)
    }
  }

  // Process scan (API call)
  const processScan = async (checkpointId, checkpointName, designatedUser) => {
    try {
      // Capture fresh location right before scanning
      let currentLocation = userLocation
      if (!currentLocation || !currentLocation.latitude || !currentLocation.longitude) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            })
          })
          currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
          setUserLocation(currentLocation)
        } catch (err) {
          console.error('Failed to get location:', err)
          toast.error('Location access required. Please enable GPS and try again.')
          completeScan(false)
          return
        }
      }

      const token = getToken()
      const scanPayload = {
        checkpointId: checkpointId,
        checkpointName: checkpointName,
        designatedUser: designatedUser,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        notes: '',
        timestamp: new Date().toISOString()
      }

      let isDesignated = false
      let errorMessage = ''
      
      if (isOnline) {
        try {
          const res = await api.post('/scans/record', scanPayload, {
            headers: { Authorization: `Bearer ${token}` },
          })
          
          // Check if guard is designated for this checkpoint
          isDesignated = res.data.designated === true

          const result = res.data.result || 'passed'
          const failureReason = res.data.failureReason

          if (result === 'passed' && isDesignated) {
            // Don't auto-unassign - keep checkpoint assigned so it shows as completed in upcoming patrols
            // Admin can manually re-assign later if needed
            completeScan(true, checkpointId, checkpointName)
          } else {
            // Failed due to GPS / distance / accuracy
            const reason =
              failureReason ||
              'Scan did not meet location/accuracy requirements. Please move closer and try again.'
            setShowTick(false)
            setShowCross(true)
            setScanState('cooldown')
            toast.error(reason)
            // Short cooldown for failed scans
            localStorage.setItem('scanResult', 'failed')
            localStorage.setItem('scanTimestamp', Date.now().toString())
            startCooldown(FAIL_COOLDOWN_MS)
            return
          }
        } catch (err) {
          // Check if error is "not designated"
          if (err.response?.data?.designated === false) {
            isDesignated = false
            errorMessage = err.response?.data?.message || 'Not designated for this checkpoint'
            // Don't save to offline - not designated scans are not reported
          } else {
            // Save offline if server fails (for other errors like network issues)
            await saveOfflineScan(scanPayload)
            isDesignated = true
          }
        }
      } else {
        // Offline mode - assume designated
        await saveOfflineScan(scanPayload)
        isDesignated = true
      }

      // Clear any safety timeout since we're handling it
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current)
        safetyTimeoutRef.current = null
      }

      if (!isDesignated) {
        // Not designated - show failed, no cooldown, no report sent
        clearTimeout(safetyTimeoutRef.current)
        setShowTick(false)
        setShowCross(true)
        setScanState('cooldown')
        toast.error(errorMessage || 'Not assigned to this checkpoint')
        // Don't save to offline, don't send report, no cooldown timer
      }
    } catch (error) {
      console.error('Process scan error:', error)
      // Clear safety timeout on error
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current)
        safetyTimeoutRef.current = null
      }
      toast.error('Scan failed. Please try again.')
      completeScan(false)
    }
  }

  // Complete scan with result
  const completeScan = (success, checkpointId = null, checkpointName = 'Checkpoint') => {
    // Prevent duplicate calls
    if (scanCompletedRef.current) return
    scanCompletedRef.current = true
    
    // Clear any processing timeout
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current)
      processingTimeoutRef.current = null
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current)
      safetyTimeoutRef.current = null
    }
    
    if (success) {
      setShowTick(true)
      setShowCross(false)
      setScanState('cooldown') // Don't restart scanner automatically after cooldown
      if (checkpointName === 'Not Assigned') {
        toast.error(checkpointName)
      } else {
        toast.success(`Checked in at ${checkpointName}`)
        // Save to localStorage for persistence
        saveScanToLocalStorage({
          id: checkpointId,
          name: checkpointName,
          success: true,
          timestamp: new Date().toISOString()
        })
      }
      
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
      
      // Save timestamp for cooldown tracking - don't refetch scans during cooldown
      localStorage.setItem('scanResult', 'success')
      localStorage.setItem('scanTimestamp', Date.now().toString())
      startCooldown(CHECKPOINT_COOLDOWN_MS, checkpointId) // 2 minutes for success
    } else {
      setShowTick(false)
      setShowCross(true)
      setScanState('cooldown') // Don't restart scanner automatically after cooldown
      // Don't show toast here - it's already shown in the error handlers
      // Save to localStorage for persistence
      saveScanToLocalStorage({
        id: checkpointId,
        name: checkpointName,
        success: false,
        timestamp: new Date().toISOString()
      })
      localStorage.setItem('scanResult', 'failed')
      localStorage.setItem('scanTimestamp', Date.now().toString())
      startCooldown(FAIL_COOLDOWN_MS) // 10 seconds for failure
    }
  }

  // Restart scanner
  const restartScanner = async () => {
    // Clear all timers
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current)
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
    
    await stopScanner()
    
    // Reset all states
    setScanState('idle')
    setCameraError(false)
    setCooldownTime(0)
    setCurrentCheckpoint(null)
    setShowTick(false)
    setShowCross(false)
    setActiveCooldownCheckpoint(null)
    lastScannedQrRef.current = ''
    
    // Clear localStorage
    localStorage.removeItem('activeCooldownCheckpoint')
    localStorage.removeItem('scanResult')
    localStorage.removeItem('scanTimestamp')
    
    // Start scanner after delay
    setTimeout(() => {
      startScanner()
    }, 500)
  }

  function formatTime(isoString) {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return '--:--'
    }
  }

  // Format date with relative labels
  function formatDateWithLabel(isoString) {
    try {
      const date = new Date(isoString)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      const scanDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      
      if (scanDate.getTime() === today.getTime()) {
        return `Today, ${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
      } else if (scanDate.getTime() === yesterday.getTime()) {
        return `Yesterday, ${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
      } else if (scanDate >= lastWeek) {
        return `This Week, ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
      } else if (scanDate >= lastMonth) {
        return `This Month, ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      }
    } catch {
      return ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--panel)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          },
        }}
      />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">QR Scanner</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm theme-text">
                Welcome, {user?.name || 'Guard'}
              </p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-xs theme-text">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400' 
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
              }`}
              aria-label="Toggle theme"
            >
              {darkMode ? <IconSun size={20} /> : <IconMoon size={20} />}
            </button>
            <button
              onClick={restartScanner}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <IconRefresh size={18} />
              <span className="text-sm font-medium">Restart Scanner</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scanner Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Scanner Card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <IconScan size={22} className="text-blue-600 dark:text-blue-400" />
                  Scan Checkpoint QR Code
                </h2>
                {cooldownTime > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <IconClock size={16} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {cooldownTime}s
                    </span>
                  </div>
                )}
              </div>

              {/* Scanner Container */}
              <div className="relative">
                {cameraError ? (
                  <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl p-8 text-center min-h-[400px]">
                    <IconCameraOff size={64} className="text-gray-400 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Camera Access Required
                    </h3>
                    <button
                      onClick={restartScanner}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors mt-4"
                    >
                      <IconCamera size={20} />
                      Try Again
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Scanner Area */}
                    <div
                      id="qr-reader"
                      ref={qrRef}
                      className={`w-full rounded-2xl overflow-hidden bg-black relative transition-all duration-300 ${
                        scanState !== 'idle' ? 'opacity-90' : ''
                      }`}
                      style={{ 
                        height: Math.min(450, window.innerWidth - 60),
                        maxHeight: '450px'
                      }}
                    >
                      {/* Visual Feedback Overlay */}
                      {scanState !== 'idle' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl z-10">
                          <div className="text-white text-center p-8 max-w-sm">
                            
                            {/* Processing */}
                            {scanState === 'processing' && (
                              <>
                                <div className="relative mb-6">
                                  <IconLoader2 size={64} className="mx-auto animate-spin text-blue-400" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-20 h-20 bg-blue-500/10 rounded-full animate-ping" />
                                  </div>
                                </div>
                                <p className="text-xl font-bold mb-2">Processing...</p>
                                <p className="text-sm opacity-75">
                                  {showTick || showCross ? 'Completing scan...' : 'Validating QR code...'}
                                </p>
                                <p className="text-xs opacity-50 mt-2">Auto-resolving in {cooldownTime}s</p>
                              </>
                            )}
                            
                            {/* Success */}
                            {showTick && (
                              <>
                                <div className="relative w-32 h-32 mx-auto mb-6">
                                  {/* Checkmark animation */}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative w-20 h-20">
                                      <svg 
                                        className="w-full h-full text-green-400" 
                                        viewBox="0 0 24 24"
                                        style={{
                                          animation: 'drawCheck 0.6s ease-out forwards',
                                          strokeDasharray: 24,
                                          strokeDashoffset: 0,
                                        }}
                                      >
                                        <polyline 
                                          points="3 12 9 18 21 6" 
                                          fill="none" 
                                          stroke="currentColor" 
                                          strokeWidth="4" 
                                          strokeLinecap="round" 
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </div>
                                  </div>
                                  <div className="absolute inset-0 rounded-full border-4 border-green-500/30 animate-pulse" />
                                </div>
                                <p className="text-xl font-bold mb-2">✓ Scan Successful</p>
                                {currentCheckpoint && (
                                  <p className="text-green-300 text-sm mb-1">{currentCheckpoint.name}</p>
                                )}
                                <p className="text-xs opacity-75">
                                  Next scan in {cooldownTime}s
                                </p>
                              </>
                            )}
                            
                            {/* Failure */}
                            {showCross && (
                              <>
                                <div className="relative w-32 h-32 mx-auto mb-6">
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative w-20 h-20">
                                      <svg 
                                        className="w-full h-full text-red-400" 
                                        viewBox="0 0 24 24"
                                        style={{
                                          animation: 'drawCross 0.6s ease-out forwards',
                                          strokeDasharray: 32,
                                          strokeDashoffset: 0,
                                        }}
                                      >
                                        <line 
                                          x1="6" y1="6" x2="18" y2="18" 
                                          stroke="currentColor" 
                                          strokeWidth="4" 
                                          strokeLinecap="round"
                                        />
                                        <line 
                                          x1="6" y1="18" x2="18" y2="6" 
                                          stroke="currentColor" 
                                          strokeWidth="4" 
                                          strokeLinecap="round"
                                        />
                                      </svg>
                                    </div>
                                  </div>
                                  <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-pulse" />
                                </div>
                                <p className="text-xl font-bold mb-2">✗ Scan Failed</p>
                                <p className="text-red-300 text-sm mb-1">
                                  {scanState === 'failed' ? 'Please try again' : 'Invalid QR code'}
                                </p>
                                <p className="text-xs opacity-75">
                                  Retry in {cooldownTime}s
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Scanner Status */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          scanState === 'idle' ? 'bg-green-500 animate-pulse' :
                          scanState === 'processing' ? 'bg-yellow-500' :
                          scanState === 'success' ? 'bg-green-500' :
                          'bg-red-500'
                        }`} />
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {scanState === 'idle' ? 'Ready to scan' : scanState}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {scanState === 'idle' ? 'Point camera at QR code' : ''}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                isOnline 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isOnline 
                      ? 'bg-green-100 dark:bg-green-800'
                      : 'bg-yellow-100 dark:bg-yellow-800'
                  }`}>
                    {isOnline ? (
                      <IconShieldCheck size={20} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <IconAlertCircle size={20} className="text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium theme-text">Network Status</p>
                    <p className="text-sm theme-text-muted">
                      {isOnline ? 'Connected' : 'Offline - saving locally'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className={`p-4 rounded-2xl border ${
                userLocation 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    userLocation 
                      ? 'bg-blue-100 dark:bg-blue-800'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    <IconLocation size={20} className={
                      userLocation 
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500'
                    } />
                  </div>
                  <div>
                    <p className="font-medium theme-text">Location</p>
                    <p className="text-sm theme-text-muted">
                      {userLocation ? 'GPS active' : 'Location not available'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Scans Panel */}
          <div className="space-y-6">
            {showPatrolHistory ? (
              // Patrol History View
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <button 
                    onClick={() => setShowPatrolHistory(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <IconArrowLeft size={24} className="text-gray-600 dark:text-gray-400" />
                  </button>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <IconHistory size={22} className="text-purple-600 dark:text-purple-400" />
                    Patrol History
                  </h2>
                </div>

                {lastScans.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {lastScans.map((scan) => (
                      <div
                        key={scan.id || scan.timestamp}
                        className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                            scan.success 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : 'bg-red-100 dark:bg-red-900/30'
                          }`}>
                            {scan.success ? (
                              <IconCheck size={20} className="text-green-600 dark:text-green-400" />
                            ) : (
                              <IconX size={20} className="text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {scan.name || scan.checkpointName || 'Unknown Checkpoint'}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                <IconClock size={14} />
                                <span>{formatDateWithLabel(scan.timestamp)}</span>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                scan.success 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {scan.success ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                      <IconQrcode size={32} className="text-gray-400 dark:text-gray-600" />
                    </div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                      No patrol history
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Your scan history will appear here
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Recent Scans Preview
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <IconHistory size={22} className="text-purple-600 dark:text-purple-400" />
                    Recent Scans
                  </h2>
                  {lastScans.length > 0 && (
                    <button 
                      onClick={() => setShowPatrolHistory(true)}
                      className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                      View All <IconEye size={16} />
                    </button>
                  )}
                </div>

                {lastScans.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {lastScans.slice(0, 2).map((scan) => (
                      <div
                        key={scan.id || scan.timestamp}
                        className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                            scan.success 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : 'bg-red-100 dark:bg-red-900/30'
                          }`}>
                            {scan.success ? (
                              <IconCheck size={20} className="text-green-600 dark:text-green-400" />
                            ) : (
                              <IconX size={20} className="text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {scan.name || scan.checkpointName || 'Unknown Checkpoint'}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                <IconClock size={14} />
                                <span>{formatDateWithLabel(scan.timestamp)}</span>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                scan.success 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {scan.success ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                      <IconQrcode size={32} className="text-gray-400 dark:text-gray-600" />
                    </div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                      No scans yet
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Start scanning checkpoint QR codes
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
              <h3 className="font-medium mb-3">Today's Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  <span className={`text-sm font-semibold capitalize ${
                    scanState === 'idle' ? 'text-green-600 dark:text-green-400' :
                    scanState === 'processing' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`}>
                    {scanState}
                  </span>
                </div>
                {cooldownTime > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Cooldown</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {cooldownTime}s
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}