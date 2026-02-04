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
  IconCameraRotate,
  IconShieldCheck,
  IconX
} from '@tabler/icons-react'
import api from '../api/axios'
import { saveOfflineScan, getOfflineScans } from '../offline/db'
import { getToken, getUser } from '../auth/authStore'

const CHECKPOINT_COOLDOWN_MS = 120000 // 2 minutes per checkpoint
const FAIL_COOLDOWN_MS = 5000 // 5 seconds for failed scans
const SCAN_PROCESSING_MS = 2000 // 2 seconds for processing

export default function ScanQR() {
  const qrRef = useRef(null)
  const scannerRef = useRef(null)
  const [scanning, setScanning] = useState(true)
  const [lastScans, setLastScans] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [cameraError, setCameraError] = useState(false)
  const [scanState, setScanState] = useState('idle') // 'idle', 'detected', 'processing', 'success', 'failed', 'cooldown'
  const [currentCheckpoint, setCurrentCheckpoint] = useState(null)
  const [cooldownTime, setCooldownTime] = useState(0)
  const [showTick, setShowTick] = useState(false)
  const [showCross, setShowCross] = useState(false)

  const user = getUser()
  const cooldownTimerRef = useRef(null)
  const processingTimeoutRef = useRef(null)
  const activeToastRef = useRef(null)

  // Network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      showToast('Back online', 'success')
    }
    const handleOffline = () => {
      setIsOnline(false)
      showToast('Offline mode', 'warning')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current)
    }
  }, [])

  // Single toast management
  const showToast = useCallback((message, type = 'default') => {
    // Clear any existing toast
    if (activeToastRef.current) {
      toast.dismiss(activeToastRef.current)
    }

    const toastOptions = {
      duration: 4000,
      style: {
        background: 'var(--panel)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
      },
    }

    switch (type) {
      case 'success':
        activeToastRef.current = toast.success(message, toastOptions)
        break
      case 'error':
        activeToastRef.current = toast.error(message, toastOptions)
        break
      case 'warning':
        activeToastRef.current = toast(message, toastOptions)
        break
      default:
        activeToastRef.current = toast(message, toastOptions)
    }
  }, [])

  // Load recent scans and location on mount
  useEffect(() => {
    loadRecentScans()
    getLocation()
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
    try {
      const token = getToken()
      const res = await api.get('/scans/my-scans', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setLastScans(res.data.slice(0, 5))
    } catch (err) {
      console.error('Failed to load scans', err)
    }
  }

  // Start cooldown timer - FIXED: Now properly handles both success and failure
  const startCooldown = useCallback((duration, type = 'checkpoint') => {
    setCooldownTime(Math.ceil(duration / 1000))

    cooldownTimerRef.current = setInterval(() => {
      setCooldownTime(prev => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current)
          
          // Reset visual indicators
          setShowTick(false)
          setShowCross(false)
          
          // Return to idle state and restart scanner
          setTimeout(() => {
            setScanState('idle')
            setCurrentCheckpoint(null)
            startScanner()
          }, 500)
          
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

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

  // Start scanner - FIXED: Proper initialization
  const startScanner = useCallback(async () => {
    if (!qrRef.current || scanState !== 'idle') return
    
    try {
      const devices = await Html5Qrcode.getCameras()
      if (devices.length === 0) {
        setCameraError(true)
        showToast('No camera found', 'error')
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
          // Prevent multiple scans while processing
          if (scanState !== 'idle') return
          
          // Set detected state
          setScanState('detected')
          
          // Stop scanner immediately
          await stopScanner()
          
          // Process scan
          await handleScan(decodedText)
        },
        (error) => {
          // Ignore minor errors
          console.log('Scanner error:', error)
        }
      )

      setScanning(true)
      setCameraError(false)
    } catch (err) {
      console.error('Camera initialization error:', err)
      setCameraError(true)
      showToast('Failed to start camera', 'error')
    }
  }, [scanState, stopScanner, showToast])

  // Initialize QR Scanner - FIXED: Clean startup
  useEffect(() => {
    if (scanState === 'idle' && !cameraError) {
      startScanner()
    }

    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
      }
    }
  }, [scanState, cameraError, startScanner])

  // Handle QR scan - FIXED: Proper state transitions
  const handleScan = async (decodedText) => {
    // Set processing state
    setScanState('processing')
    showToast('Processing QR code...', 'default')

    try {
      let qrData
      try {
        qrData = JSON.parse(decodedText)
      } catch {
        throw new Error('Invalid QR code format')
      }

      if (qrData.type !== 'patrol-checkpoint' || !qrData.id) {
        throw new Error('Invalid patrol checkpoint QR')
      }

      const checkpointId = qrData.id
      const checkpointName = qrData.checkpointName || qrData.name || 'Unknown Checkpoint'

      setCurrentCheckpoint({
        id: checkpointId,
        name: checkpointName
      })

      // Check checkpoint cooldown
      const lastScanTime = localStorage.getItem(`lastScan_${checkpointId}`)
      if (lastScanTime && (Date.now() - parseInt(lastScanTime)) < CHECKPOINT_COOLDOWN_MS) {
        const remaining = Math.ceil((CHECKPOINT_COOLDOWN_MS - (Date.now() - parseInt(lastScanTime))) / 1000)
        throw new Error(`Please wait ${remaining}s before scanning this checkpoint again`)
      }

      // Prepare scan payload
      const token = getToken()
      const scanPayload = {
        checkpointId: checkpointId,
        checkpointName: checkpointName,
        latitude: userLocation?.latitude || null,
        longitude: userLocation?.longitude || null,
        accuracy: userLocation?.accuracy || null,
        notes: '',
        timestamp: new Date().toISOString()
      }

      // Simulate processing time
      await new Promise(resolve => {
        processingTimeoutRef.current = setTimeout(resolve, SCAN_PROCESSING_MS)
      })

      let success = false
      
      if (isOnline) {
        try {
          await api.post('/scans/record', scanPayload, {
            headers: { Authorization: `Bearer ${token}` },
          })
          success = true
        } catch (err) {
          // Save offline if server fails
          await saveOfflineScan(scanPayload)
          success = true // Still considered success when saved offline
        }
      } else {
        await saveOfflineScan(scanPayload)
        success = true
      }

      if (success) {
        // Save successful scan time
        localStorage.setItem(`lastScan_${checkpointId}`, Date.now().toString())
        
        // Show tick animation
        setShowTick(true)
        setScanState('success')
        showToast(`Successfully checked in at ${checkpointName}`, 'success')
        
        // Vibrate on success
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100])
        }
        
        await loadRecentScans()
        
        // Start checkpoint cooldown (2 minutes)
        startCooldown(CHECKPOINT_COOLDOWN_MS, 'checkpoint')
      } else {
        throw new Error('Failed to save scan')
      }

    } catch (error) {
      console.error('Scan error:', error)
      
      // Show cross animation
      setShowCross(true)
      setScanState('failed')
      showToast(error.message, 'error')
      
      // Start short cooldown for failed scans (5 seconds)
      startCooldown(FAIL_COOLDOWN_MS, 'failed')
    }
  }

  // Restart scanner
  const restartScanner = async () => {
    // Clear all timeouts and intervals
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current)
    }
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current)
    }
    
    await stopScanner()
    
    // Reset all states
    setScanState('idle')
    setCameraError(false)
    setCooldownTime(0)
    setCurrentCheckpoint(null)
    setShowTick(false)
    setShowCross(false)
    
    // Start scanner after a brief delay
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
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">QR Scanner</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Welcome, {user?.name || 'Guard'}
              </p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-xs text-gray-500">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
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
                <div className="flex items-center gap-2">
                  {scanState === 'cooldown' && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <IconClock size={16} className="text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {cooldownTime}s
                      </span>
                    </div>
                  )}
                </div>
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
                      {/* Animated Overlay */}
                      {scanState !== 'idle' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl z-10">
                          <div className="text-white text-center p-8 max-w-sm">
                            
                            {/* Success Tick Animation */}
                            {showTick && (
                              <div className="mb-6">
                                <div className="relative w-32 h-32 mx-auto">
                                  {/* Animated circle */}
                                  <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping" />
                                  
                                  {/* Checkmark animation */}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative w-20 h-20">
                                      {/* Checkmark drawing animation */}
                                      <svg 
                                        className="w-full h-full text-green-400" 
                                        viewBox="0 0 24 24"
                                        style={{
                                          animation: 'drawCheck 0.6s ease-out forwards',
                                          strokeDasharray: 24,
                                          strokeDashoffset: 24,
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
                                  
                                  {/* Pulsing effect */}
                                  <div className="absolute inset-0 rounded-full border-4 border-green-500/30 animate-pulse" />
                                </div>
                                
                                <div className="mt-6">
                                  <p className="text-xl font-bold mb-2">✓ Check-in Successful</p>
                                  <p className="text-green-300 text-sm mb-1">{currentCheckpoint?.name}</p>
                                  <p className="text-xs opacity-75">
                                    Next scan in {cooldownTime}s
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* Failure Cross Animation */}
                            {showCross && (
                              <div className="mb-6">
                                <div className="relative w-32 h-32 mx-auto">
                                  {/* Animated circle */}
                                  <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping" />
                                  
                                  {/* Cross animation */}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative w-20 h-20">
                                      <svg 
                                        className="w-full h-full text-red-400" 
                                        viewBox="0 0 24 24"
                                        style={{
                                          animation: 'drawCross 0.6s ease-out forwards',
                                          strokeDasharray: 32,
                                          strokeDashoffset: 32,
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
                                  
                                  {/* Pulsing effect */}
                                  <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-pulse" />
                                </div>
                                
                                <div className="mt-6">
                                  <p className="text-xl font-bold mb-2">✗ Scan Failed</p>
                                  <p className="text-red-300 text-sm mb-1">
                                    {scanState === 'failed' ? 'Please try again' : 'Invalid QR code'}
                                  </p>
                                  <p className="text-xs opacity-75">
                                    Retry in {cooldownTime}s
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* Processing Spinner */}
                            {scanState === 'processing' && (
                              <>
                                <div className="relative mb-6">
                                  <IconLoader2 size={64} className="mx-auto animate-spin text-blue-400" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-20 h-20 bg-blue-500/10 rounded-full animate-ping" />
                                  </div>
                                </div>
                                <p className="text-xl font-bold mb-2">Processing Scan</p>
                                <p className="text-sm opacity-75">Validating checkpoint...</p>
                              </>
                            )}
                            
                            {/* Detected State */}
                            {scanState === 'detected' && (
                              <>
                                <div className="relative mb-6">
                                  <IconScan size={64} className="mx-auto animate-pulse text-yellow-400" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-24 h-24 bg-yellow-500/10 rounded-full animate-ping" />
                                  </div>
                                </div>
                                <p className="text-xl font-bold mb-2">QR Code Detected</p>
                                <p className="text-sm opacity-75">Processing in 1 second...</p>
                              </>
                            )}
                            
                            {/* Cooldown without success/failure (just timer) */}
                            {scanState === 'cooldown' && !showTick && !showCross && (
                              <>
                                <div className="relative mb-6">
                                  <IconClock size={64} className="mx-auto text-blue-400" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-3xl font-bold text-white">{cooldownTime}</div>
                                  </div>
                                  <div className="absolute -inset-4 rounded-full border-4 border-blue-500/20 animate-ping" />
                                </div>
                                <p className="text-xl font-bold mb-2">Cooldown Active</p>
                                <p className="text-sm opacity-75">Scanner will resume automatically</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Scanner Status Bar */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          scanState === 'idle' ? 'bg-green-500 animate-pulse' :
                          scanState === 'processing' ? 'bg-yellow-500' :
                          scanState === 'success' ? 'bg-green-500' :
                          scanState === 'failed' ? 'bg-red-500' :
                          'bg-blue-500'
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
                    <p className="font-medium">Network Status</p>
                    <p className={`text-sm ${
                      isOnline 
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-yellow-700 dark:text-yellow-400'
                    }`}>
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
                    <p className="font-medium">Location</p>
                    <p className={`text-sm ${
                      userLocation 
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {userLocation ? 'GPS active' : 'Location not available'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Scans Panel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <IconHistory size={22} className="text-purple-600 dark:text-purple-400" />
                Recent Scans
              </h2>

              {lastScans.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {lastScans.map((scan) => (
                    <div
                      key={scan.id || scan.timestamp}
                      className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-1">
                          <IconCheck size={20} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {scan.checkpointName || 'Unknown Checkpoint'}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                              <IconClock size={14} />
                              <span>{formatTime(scan.scannedAt || scan.timestamp)}</span>
                            </div>
                            {scan.location && (
                              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                <IconMapPin size={14} />
                                <span className="truncate">{scan.location}</span>
                              </div>
                            )}
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

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
              <h3 className="font-medium mb-3">Today's Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Scans Today</span>
                  <span className="font-semibold">
                    {lastScans.filter(s => {
                      try {
                        const scanDate = new Date(s.scannedAt || s.timestamp)
                        const today = new Date()
                        return scanDate.toDateString() === today.toDateString()
                      } catch {
                        return false
                      }
                    }).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  <span className={`text-sm font-semibold capitalize ${
                    scanState === 'idle' ? 'text-green-600 dark:text-green-400' :
                    scanState === 'cooldown' ? 'text-blue-600 dark:text-blue-400' :
                    'text-yellow-600 dark:text-yellow-400'
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

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes drawCheck {
          to {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes drawCross {
          to {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .animate-ping {
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}