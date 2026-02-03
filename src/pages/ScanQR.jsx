import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Toaster, toast } from 'react-hot-toast'
import {
  IconCamera,
  IconCheck,
  IconMapPin,
  IconHistory,
  IconClock
} from '@tabler/icons-react'
import api from '../api/axios'
import { saveOfflineScan } from '../offline/db'
import { getToken, getUser } from '../auth/authStore'

export default function ScanQR() {
  const qrRef = useRef(null)
  const scannerRef = useRef(null)
  const isRunningRef = useRef(false)
  const lastScanRef = useRef(0)

  const [scanning, setScanning] = useState(true)
  const [lastScans, setLastScans] = useState([])
  const [userLocation, setUserLocation] = useState(null)

  // Get user info
  const user = getUser()

  // Load recent scans on mount
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
            timeout: 10000
          })
        })
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
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
      // Show last 5 scans
      setLastScans(res.data.slice(-5).reverse())
    } catch (err) {
      console.error('Failed to load scans', err)
    }
  }

  useEffect(() => {
    let isMounted = true

    const startScanner = async () => {
      if (!qrRef.current) return

      const scanner = new Html5Qrcode(qrRef.current.id)
      scannerRef.current = scanner

      try {
        const devices = await Html5Qrcode.getCameras()
        if (!devices.length || !isMounted) {
          toast.error('No camera found')
          setScanning(false)
          return
        }

        // Prefer back camera
        const backCamera = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear')
        ) || devices[0]

        await scanner.start(
          backCamera.id,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (!isRunningRef.current) return

            const now = Date.now()
            if (now - lastScanRef.current < 3000) return
            lastScanRef.current = now

            // Parse QR code content
            let qrData
            try {
              qrData = JSON.parse(decodedText)
            } catch {
              toast.error('Invalid QR code')
              return
            }

            if (qrData.type !== 'patrol-checkpoint' || !qrData.id) {
              toast.error('Invalid checkpoint QR')
              return
            }

            isRunningRef.current = false
            await scanner.stop()

            const token = getToken()
            const scanPayload = {
              checkpointId: qrData.id,
              latitude: userLocation?.latitude || null,
              longitude: userLocation?.longitude || null,
              notes: ''
            }

            try {
              if (navigator.onLine) {
                const res = await api.post('/scans/record', scanPayload, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                toast.success(`Checked in: ${res.data.checkpointName}`)
                // Reload recent scans
                loadRecentScans()
              } else {
                await saveOfflineScan({
                  ...scanPayload,
                  scannedAt: new Date().toISOString()
                })
                toast('Offline scan saved', { icon: '📦' })
              }
            } catch (err) {
              toast.error(err.response?.data?.error || 'Failed to record scan')
            }

            // Restart scanner
            setTimeout(() => {
              if (isMounted) {
                startScanner()
              }
            }, 1500)
          }
        )

        isRunningRef.current = true
      } catch (err) {
        console.error('QR start error:', err)
        toast.error('Failed to start camera')
        setScanning(false)
      }
    }

    const timeout = setTimeout(startScanner, 100)

    return () => {
      isMounted = false
      clearTimeout(timeout)

      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [userLocation])

  function formatTime(isoString) {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Toaster position="top-center" />

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Scan Checkpoint</h1>
        <p className="text-sm text-[color:var(--text-muted)]">
          Welcome, {user?.name}. Align the QR code to scan.
        </p>
      </div>

      {/* Scanner */}
      <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-4 shadow-[var(--shadow)]">
        <div
          ref={qrRef}
          id="qr-reader"
          className="w-full h-[300px] bg-black rounded-xl overflow-hidden relative"
        />

        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <button
              onClick={() => window.location.reload()}
              className="flex flex-col items-center gap-2 text-white"
            >
              <IconCamera size={48} />
              <span>Tap to retry</span>
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[color:var(--text-muted)]">
          <IconCamera size={16} />
          <span>Point camera at checkpoint QR code</span>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-4 shadow-[var(--shadow)]">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <IconHistory size={20} />
          Recent Scans
        </h2>

        {lastScans.length > 0 ? (
          <div className="space-y-3">
            {lastScans.map((scan) => (
              <div
                key={scan.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-[color:var(--bg-muted)]"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <IconCheck size={20} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{scan.checkpointName}</p>
                  <p className="text-xs text-[color:var(--text-muted)] flex items-center gap-1">
                    <IconClock size={12} />
                    {formatTime(scan.scannedAt)}
                  </p>
                </div>
                <IconMapPin size={16} className="text-[color:var(--text-muted)]" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-[color:var(--text-muted)] py-4">
            No scans yet. Start scanning checkpoints!
          </p>
        )}
      </div>
    </div>
  )
}
