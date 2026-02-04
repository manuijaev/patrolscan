import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
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
  IconWifiOff,
  IconLocation,
  IconShieldCheck,
  IconDeviceMobile,
  IconCameraOff,
  IconCameraRotate
} from '@tabler/icons-react'
import api from '../api/axios'
import { saveOfflineScan, getOfflineScans } from '../offline/db'
import { getToken, getUser } from '../auth/authStore'

export default function ScanQR() {
  const qrRef = useRef(null)
  const scannerRef = useRef(null)
  const [scanning, setScanning] = useState(true)
  const [lastScans, setLastScans] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [recentlyScanned, setRecentlyScanned] = useState([])
  const [loading, setLoading] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [cameraId, setCameraId] = useState('')
  const [isFrontCamera, setIsFrontCamera] = useState(false)

  // Get user info
  const user = getUser()

  // Network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Back online')
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
    }
  }, [])

  // Load recent scans and location on mount
  useEffect(() => {
    loadRecentScans()
    loadOfflineScans()
    getLocation()
  }, [])

  // Get user location
  async function getLocation() {
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
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
        toast.error('Location access denied. Scans will continue without location data.')
      }
    }
  }

  async function loadRecentScans() {
    try {
      const token = getToken()
      const res = await api.get('/scans/my-recent', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setLastScans(res.data.slice(0, 5))
      // Track recently scanned for cooldown
      setRecentlyScanned(res.data.map(scan => scan.checkpointId))
    } catch (err) {
      console.error('Failed to load scans', err)
    }
  }

  async function loadOfflineScans() {
    try {
      const offlineScans = await getOfflineScans()
      if (offlineScans.length > 0) {
        toast(`You have ${offlineScans.length} offline scans saved locally`)
      }
    } catch (err) {
      console.error('Failed to load offline scans', err)
    }
  }

  // Initialize QR Scanner with better camera handling
  useEffect(() => {
    if (!scanning || !qrRef.current) return

    const initScanner = async () => {
      try {
        const devices = await Html5QrcodeScanner.prototype.getCameras()
        if (devices.length === 0) {
          setCameraError(true)
          toast.error('No camera found on this device')
          return
        }

        // Try to find back camera first
        const backCamera = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        )
        
        const frontCamera = devices.find(d => 
          d.label.toLowerCase().includes('front') || 
          d.label.toLowerCase().includes('user') ||
          d.label.toLowerCase().includes('selfie')
        )

        const selectedCamera = backCamera || frontCamera || devices[0]
        setCameraId(selectedCamera.id)
        setIsFrontCamera(selectedCamera.label.toLowerCase().includes('front'))

        const scanner = new Html5QrcodeScanner(
          qrRef.current.id,
          {
            fps: 10,
            qrbox: {
              width: Math.min(300, window.innerWidth - 60),
              height: Math.min(300, window.innerWidth - 60)
            },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true
          },
          false
        )

        scannerRef.current = scanner

        scanner.render(
          async (decodedText) => {
            await handleScan(decodedText)
          },
          (error) => {
            console.log('QR scanning error:', error)
            if (error.includes('NotAllowedError')) {
              setCameraError(true)
              toast.error('Camera access was denied')
            }
          }
        )
      } catch (err) {
        console.error('Camera initialization error:', err)
        setCameraError(true)
        toast.error('Failed to initialize camera')
      }
    }

    initScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
      }
    }
  }, [scanning])

  // Toggle camera front/back
  const toggleCamera = async () => {
    if (!scannerRef.current) return

    try {
      const devices = await Html5QrcodeScanner.prototype.getCameras()
      const currentIsFront = isFrontCamera
      
      // Find opposite camera
      const targetCamera = devices.find(device => {
        const isFront = device.label.toLowerCase().includes('front') || 
                       device.label.toLowerCase().includes('user') ||
                       device.label.toLowerCase().includes('selfie')
        return currentIsFront ? !isFront : isFront
      })

      if (targetCamera) {
        scannerRef.current.clear()
        setCameraId(targetCamera.id)
        setIsFrontCamera(!isFrontCamera)
        
        // Reinitialize with new camera
        const scanner = new Html5QrcodeScanner(
          qrRef.current.id,
          {
            fps: 10,
            qrbox: {
              width: Math.min(300, window.innerWidth - 60),
              height: Math.min(300, window.innerWidth - 60)
            },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true
          },
          false
        )

        scannerRef.current = scanner

        scanner.render(
          async (decodedText) => {
            await handleScan(decodedText)
          },
          (error) => {
            console.log('QR scanning error:', error)
          }
        )
        
        toast.success(`Switched to ${isFrontCamera ? 'back' : 'front'} camera`)
      }
    } catch (err) {
      console.error('Failed to switch camera:', err)
      toast.error('Failed to switch camera')
    }
  }

  // Handle QR scan with cooldown protection
  const handleScan = async (decodedText) => {
    setLoading(true)
    
    try {
      // Parse QR code content
      let qrData
      try {
        qrData = JSON.parse(decodedText)
      } catch {
        toast.error('Invalid QR code format')
        setLoading(false)
        return
      }

      // Validate QR data
      if (qrData.type !== 'patrol-checkpoint' || !qrData.id || !qrData.checkpointName) {
        toast.error('Invalid patrol checkpoint QR')
        setLoading(false)
        return
      }

      const checkpointId = qrData.id
      const checkpointName = qrData.checkpointName

      // Check if recently scanned (prevent duplicates within 2 minutes)
      const now = Date.now()
      const lastScanTime = localStorage.getItem(`lastScan_${checkpointId}`)
      
      if (lastScanTime && (now - parseInt(lastScanTime)) < 120000) {
        const timeLeft = Math.ceil((120000 - (now - parseInt(lastScanTime))) / 1000)
        toast.error(`Please wait ${timeLeft} seconds before scanning this checkpoint again`)
        setLoading(false)
        return
      }

      // Show scanning toast
      const scanToast = toast.loading(`Scanning ${checkpointName}...`)

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

      let result
      let success = false
      
      if (isOnline) {
        // Online: Send to server
        try {
          const res = await api.post('/scans/record', scanPayload, {
            headers: { Authorization: `Bearer ${token}` },
          })
          result = res.data
          success = true
          
          // Update last scan time
          localStorage.setItem(`lastScan_${checkpointId}`, now.toString())
          
          toast.success(`Checked in at ${checkpointName}`, {
            id: scanToast
          })
          
          // Vibrate on success
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100])
          }
        } catch (err) {
          // If server fails, save offline
          await saveOfflineScan(scanPayload)
          toast('Saved offline (network issue)', {
            id: scanToast
          })
        }
      } else {
        // Offline: Save locally
        await saveOfflineScan(scanPayload)
        toast('Scan saved offline', {
          id: scanToast
        })
      }

      // Refresh recent scans
      await loadRecentScans()
      
      // Pause scanner for 1.5 seconds after successful scan
      if (success && scannerRef.current) {
        scannerRef.current.pause()
        setTimeout(() => {
          if (scannerRef.current) {
            scannerRef.current.resume()
          }
          setLoading(false)
        }, 1500)
      } else {
        setLoading(false)
      }

    } catch (error) {
      console.error('Scan error:', error)
      toast.error('Failed to process scan')
      setLoading(false)
    }
  }

  // Restart scanner
  const restartScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
    }
    setCameraError(false)
    setScanning(false)
    setTimeout(() => setScanning(true), 100)
  }

  // Format time
  function formatTime(isoString) {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Format date
  function formatDate(isoString) {
    const date = new Date(isoString)
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
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
            {userLocation && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                <IconLocation size={16} className="text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-700 dark:text-blue-300">Location Active</span>
              </div>
            )}
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
          {/* Scanner Panel - Takes 2 columns on desktop */}
          <div className="lg:col-span-2 space-y-6">
            {/* Scanner Card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <IconScan size={22} className="text-blue-600 dark:text-blue-400" />
                  Scan Checkpoint QR Code
                </h2>
                <button
                  onClick={toggleCamera}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <IconCameraRotate size={18} />
                  <span className="text-sm">Switch Camera</span>
                </button>
              </div>

              {/* Scanner Container */}
              <div className="relative">
                {cameraError ? (
                  <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl p-8 text-center min-h-[400px]">
                    <IconCameraOff size={64} className="text-gray-400 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Camera Access Required
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                      Please allow camera access to scan QR codes. If you denied permission, please update your browser settings.
                    </p>
                    <button
                      onClick={restartScanner}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                    >
                      <IconCamera size={20} />
                      Grant Camera Access
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Scanner Box with responsive sizing */}
                    <div
                      ref={qrRef}
                      id="qr-reader"
                      className="w-full bg-black rounded-2xl overflow-hidden relative"
                      style={{
                        height: Math.min(500, window.innerWidth - 80),
                        maxHeight: '500px'
                      }}
                    >
                      {/* Scanner Overlay */}
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Corner borders */}
                        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl" />
                        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl" />
                        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl" />
                        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-2xl" />
                        
                        {/* Center guide */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 rounded-2xl" />
                        
                        {/* Scanning animation */}
                        {scanning && (
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48">
                            <div className="h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Scanner Instructions */}
                    <div className="mt-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                            <IconDeviceMobile size={20} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Hold Steady</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Keep phone stable for better scan</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                            <IconShieldCheck size={20} className="text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Cooldown Period</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">2 minutes between same checkpoint</p>
                          </div>
                        </div>
                      </div>

                      {loading && (
                        <div className="flex items-center justify-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                          <IconLoader2 size={20} className="text-yellow-600 dark:text-yellow-400 animate-spin" />
                          <span className="font-medium text-yellow-700 dark:text-yellow-300">
                            Processing scan...
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Network Status & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${isOnline ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'} flex items-center justify-center`}>
                    {isOnline ? (
                      <IconShieldCheck size={24} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <IconWifiOff size={24} className="text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Network Status</p>
                    <p className={`text-sm ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                      {isOnline ? 'Connected to server' : 'Working offline - scans saved locally'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${userLocation ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'} flex items-center justify-center`}>
                    <IconLocation size={24} className={userLocation ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'} />
                  </div>
                  <div>
                    <p className="font-medium">Location</p>
                    <p className={`text-sm ${userLocation ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {userLocation ? 'GPS location active' : 'Location not available'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Scans Panel - Takes 1 column on desktop */}
          <div className="space-y-6">
            {/* Recent Scans Card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <IconHistory size={22} className="text-purple-600 dark:text-purple-400" />
                Recent Scans
              </h2>

              {lastScans.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {lastScans.map((scan) => (
                    <div
                      key={scan.id || scan.timestamp}
                      className="group p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-1">
                          <IconCheck size={20} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {scan.checkpointName || 'Unknown Checkpoint'}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                              <IconClock size={14} />
                              <span>{formatTime(scan.scannedAt || scan.timestamp)}</span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(scan.scannedAt || scan.timestamp)}
                            </div>
                          </div>
                          {scan.location && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <IconMapPin size={12} />
                              <span className="truncate">{scan.location}</span>
                            </div>
                          )}
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
                    Start scanning checkpoint QR codes to see your history here.
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
                  <span className="font-semibold">{lastScans.filter(s => {
                    const scanDate = new Date(s.scannedAt || s.timestamp)
                    const today = new Date()
                    return scanDate.toDateString() === today.toDateString()
                  }).length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Unique Checkpoints</span>
                  <span className="font-semibold">
                    {new Set(lastScans.map(s => s.checkpointId)).size}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Last Scan</span>
                  <span className="font-semibold text-sm">
                    {lastScans[0] ? formatTime(lastScans[0].scannedAt || lastScans[0].timestamp) : '--:--'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}