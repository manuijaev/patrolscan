import { useEffect, useRef, useState } from 'react'
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
  const [loading, setLoading] = useState(false)
  const [cameraError, setCameraError] = useState(false)

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
      const res = await api.get('/scans/my-scans', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setLastScans(res.data.slice(0, 5))
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

  // Initialize QR Scanner
  useEffect(() => {
    if (!scanning || !qrRef.current) return

    let isMounted = true
    const scanner = new Html5Qrcode('qr-reader')

    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras()
        if (devices.length === 0) {
          setCameraError(true)
          toast.error('No camera found')
          return
        }

        // Find back camera
        const backCamera = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        ) || devices[0]

        scannerRef.current = scanner

        await scanner.start(
          backCamera.id,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            await handleScan(decodedText)
          },
          (errorMessage) => {
            // Ignore scan errors - they're expected when no QR is in view
          }
        )

        isMounted && setScanning(true)
      } catch (err) {
        console.error('Camera initialization error:', err)
        setCameraError(true)
        toast.error('Failed to initialize camera')
      }
    }

    startScanner()

    return () => {
      isMounted = false
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [scanning])

  // Handle QR scan
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

      if (isOnline) {
        try {
          const res = await api.post('/scans/record', scanPayload, {
            headers: { Authorization: `Bearer ${token}` },
          })
          toast.success(`Checked in at ${checkpointName}`, { id: scanToast })
          
          // Vibrate on success
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100])
          }
        } catch (err) {
          await saveOfflineScan(scanPayload)
          toast('Saved offline (network issue)', { id: scanToast })
        }
      } else {
        await saveOfflineScan(scanPayload)
        toast('Scan saved offline', { id: scanToast })
      }

      await loadRecentScans()
      setLoading(false)
    } catch (error) {
      console.error('Scan error:', error)
      toast.error('Failed to process scan')
      setLoading(false)
    }
  }

  // Restart scanner
  const restartScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch (e) {}
    }
    setCameraError(false)
    setScanning(false)
    setTimeout(() => setScanning(true), 500)
  }

  // Toggle camera
  const toggleCamera = async () => {
    if (!scannerRef.current) return

    try {
      const devices = await Html5Qrcode.getCameras()
      const currentCameraId = scannerRef.current.id

      // Find different camera
      const otherCamera = devices.find(d => d.id !== currentCameraId)
      
      if (otherCamera) {
        await scannerRef.current.stop()
        
        await scannerRef.current.start(
          otherCamera.id,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            await handleScan(decodedText)
          },
          () => {}
        )

        toast.success('Camera switched')
      }
    } catch (err) {
      console.error('Failed to switch camera:', err)
      toast.error('Failed to switch camera')
    }
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
            <button
              onClick={restartScanner}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <IconRefresh size={18} />
              <span className="text-sm font-medium">Restart</span>
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
                <button
                  onClick={toggleCamera}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <IconCameraRotate size={18} />
                  <span className="text-sm">Switch</span>
                </button>
              </div>

              {/* Scanner Container */}
              <div className="relative">
                {cameraError ? (
                  <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl p-8 text-center min-h-[300px]">
                    <IconCameraOff size={64} className="text-gray-400 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Camera Access Required
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                      Please allow camera access to scan QR codes.
                    </p>
                    <button
                      onClick={restartScanner}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                    >
                      <IconCamera size={20} />
                      Grant Access
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      id="qr-reader"
                      ref={qrRef}
                      className="w-full rounded-2xl overflow-hidden bg-black"
                      style={{ height: '350px' }}
                    />
                    {loading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                        <div className="flex flex-col items-center gap-2 text-white">
                          <IconLoader2 size={32} className="animate-spin" />
                          <span>Processing...</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recent Scans Panel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-4 sm:p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <IconHistory size={22} className="text-blue-600 dark:text-blue-400" />
                Recent Scans
              </h2>

              {lastScans.length > 0 ? (
                <div className="space-y-3">
                  {lastScans.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                        <IconCheck size={24} className="text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{scan.checkpointName}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <IconClock size={14} />
                          {formatTime(scan.scannedAt)}
                        </p>
                      </div>
                      <IconMapPin size={18} className="text-gray-400 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <IconQrcode size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No scans yet. Start scanning!</p>
                </div>
              )}
            </div>

            {/* Location Status */}
            {userLocation && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <IconLocation size={20} />
                  <span className="font-medium">Location Active</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Accuracy: ±{Math.round(userLocation.accuracy)}m
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
