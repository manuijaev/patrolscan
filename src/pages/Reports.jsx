import { useEffect, useRef, useState } from 'react'
import {
  IconDownload,
  IconCalendar,
  IconUser,
  IconMapPin,
  IconClock,
  IconSearch,
  IconLoader2,
  IconTrash,
  IconCheck,
} from '@tabler/icons-react'
import api from '../api/axios'
import { getToken } from '../auth/authStore'

function getDeletionRangeStart(range) {
  const now = new Date()
  const start = new Date(now)

  switch (range) {
    case '7d':
      start.setDate(now.getDate() - 7)
      return start
    case '1m':
      start.setMonth(now.getMonth() - 1)
      return start
    case '6m':
      start.setMonth(now.getMonth() - 6)
      return start
    case '1y':
      start.setFullYear(now.getFullYear() - 1)
      return start
    default:
      start.setDate(now.getDate() - 7)
      return start
  }
}

export default function Reports() {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedScanIds, setSelectedScanIds] = useState([])
  const [deleteRange, setDeleteRange] = useState('7d')
  const [deleting, setDeleting] = useState(false)
  const longPressTimerRef = useRef(null)

  function toMetersText(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A'
    return `${value.toFixed(2)}m`
  }

  function locationText(value) {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'object') {
      const lat = value.latitude
      const lon = value.longitude
      const acc = value.accuracy
      if (typeof lat === 'number' && typeof lon === 'number') {
        const coord = `${lat.toFixed(5)}, ${lon.toFixed(5)}`
        return typeof acc === 'number' ? `${coord} (±${Math.round(acc)}m)` : coord
      }
      try {
        return JSON.stringify(value)
      } catch {
        return ''
      }
    }
    return String(value)
  }

  function buildResultDetails(scanItem) {
    const location = scanItem?.location
    const gpsAccuracy =
      location && typeof location === 'object' && typeof location.accuracy === 'number'
        ? location.accuracy
        : null
    const computedDistance =
      location && typeof location === 'object' && typeof location.computedDistanceMeters === 'number'
        ? location.computedDistanceMeters
        : null
    const allowedRadius =
      location && typeof location === 'object' && typeof location.allowedRadius === 'number'
        ? location.allowedRadius
        : null

    const reason =
      typeof scanItem.failureReason === 'string' && scanItem.failureReason.trim()
        ? scanItem.failureReason
        : (scanItem.result === 'failed' ? 'Validation failed' : 'Passed')

    return {
      reason,
      gpsAccuracy,
      computedDistance,
      allowedRadius,
      distanceVsAllowed:
        computedDistance !== null && allowedRadius !== null
          ? `${toMetersText(computedDistance)} / ${toMetersText(allowedRadius)}`
          : 'N/A',
    }
  }

  function normalizeScan(scanItem) {
    const result = scanItem.result === 'failed' ? 'failed' : 'passed'
    return {
      ...scanItem,
      result,
      failureReason:
        typeof scanItem.failureReason === 'string' ? scanItem.failureReason : null,
      guardName:
        typeof scanItem.guardName === 'string'
          ? scanItem.guardName
          : (scanItem.guardName ? String(scanItem.guardName) : 'Unknown Guard'),
      checkpointName:
        typeof scanItem.checkpointName === 'string'
          ? scanItem.checkpointName
          : (scanItem.checkpointName ? String(scanItem.checkpointName) : 'Unknown Checkpoint'),
      locationText: locationText(scanItem.location),
      resultDetails: buildResultDetails({ ...scanItem, result }),
    }
  }

  async function loadScans() {
    setLoading(true)
    setError('')
    try {
      const token = getToken()
      if (!token) {
        setError('No authentication token found')
        return
      }

      let startDate
      let endDate
      const now = new Date()

      switch (dateRange) {
        case 'all':
          startDate = new Date('2020-01-01').toISOString()
          endDate = new Date('2030-12-31').toISOString()
          break
        case 'today': {
          const todayStart = new Date(now)
          todayStart.setHours(0, 0, 0, 0)
          const todayEnd = new Date(now)
          todayEnd.setHours(23, 59, 59, 999)
          startDate = todayStart.toISOString()
          endDate = todayEnd.toISOString()
          break
        }
        case 'week': {
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - 7)
          startDate = weekStart.toISOString()
          endDate = now.toISOString()
          break
        }
        case 'month': {
          const monthStart = new Date(now)
          monthStart.setMonth(now.getMonth() - 1)
          startDate = monthStart.toISOString()
          endDate = now.toISOString()
          break
        }
        case 'custom':
          if (!customStart || !customEnd) {
            setError('Please select both start and end dates')
            return
          }
          startDate = new Date(customStart).toISOString()
          endDate = new Date(customEnd).toISOString()
          break
        default:
          startDate = new Date('2020-01-01').toISOString()
          endDate = new Date('2030-12-31').toISOString()
      }

      const res = await api.get(`/scans/date-range?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const normalized = (res.data || []).map(normalizeScan)
      setScans(normalized)
    } catch (err) {
      console.error('Failed to load scans', err)
      setError(err.response?.data?.message || 'Failed to load scans. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadScans()
  }, [dateRange])

  useEffect(() => {
    if (dateRange === 'custom' && customStart && customEnd) {
      loadScans()
    }
  }, [customStart, customEnd])

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }, [])

  function formatDate(isoString) {
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  function formatTime(isoString) {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Invalid time'
    }
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function enterSelectionMode(scanId) {
    if (!scanId) return
    setSelectionMode(true)
    setSelectedScanIds(prev => (prev.includes(scanId) ? prev : [...prev, scanId]))
  }

  function onCardPressStart(scanId) {
    if (selectionMode || !scanId) return
    clearLongPressTimer()
    longPressTimerRef.current = setTimeout(() => {
      enterSelectionMode(scanId)
    }, 1000)
  }

  function onCardPressEnd() {
    clearLongPressTimer()
  }

  function toggleScanSelection(scanId) {
    if (!scanId) return
    setSelectedScanIds(prev =>
      prev.includes(scanId) ? prev.filter(id => id !== scanId) : [...prev, scanId]
    )
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedScanIds([])
  }

  const filteredScans = scans.filter(scanItem => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      (scanItem.guardName || '').toLowerCase().includes(term) ||
      (scanItem.checkpointName || '').toLowerCase().includes(term) ||
      (scanItem.locationText || '').toLowerCase().includes(term) ||
      (scanItem.resultDetails?.reason || '').toLowerCase().includes(term)
    )
  })

  const deletionStart = getDeletionRangeStart(deleteRange)
  const deletableScans = filteredScans.filter(scanItem => {
    if (!scanItem?.id) return false
    const scannedAt = new Date(scanItem.scannedAt)
    return !Number.isNaN(scannedAt.getTime()) && scannedAt >= deletionStart
  })

  useEffect(() => {
    if (!selectionMode) return
    const deletableIds = new Set(deletableScans.map(item => item.id))
    setSelectedScanIds(prev => prev.filter(id => deletableIds.has(id)))
  }, [selectionMode, deleteRange, searchTerm, scans])

  const displayedScans = selectionMode ? deletableScans : filteredScans

  async function deleteSelectedScans() {
    if (!selectedScanIds.length || deleting) return

    const confirmed = window.confirm(`Delete ${selectedScanIds.length} selected report(s) permanently?`)
    if (!confirmed) return

    setDeleting(true)
    setError('')
    try {
      await api.delete('/scans/bulk-delete', {
        data: { ids: selectedScanIds },
      })

      setScans(prev => prev.filter(scan => !selectedScanIds.includes(scan.id)))
      exitSelectionMode()
    } catch (err) {
      console.error('Failed to delete selected reports', err)
      setError(err.response?.data?.message || 'Failed to delete selected reports.')
    } finally {
      setDeleting(false)
    }
  }

  function exportCSV() {
    if (filteredScans.length === 0) return

    const headers = ['Date', 'Time', 'Guard', 'Checkpoint', 'Location', 'Result', 'Reason', 'GPS Accuracy', 'Distance / Allowed']
    const rows = filteredScans.map(scanItem => [
      formatDate(scanItem.scannedAt),
      formatTime(scanItem.scannedAt),
      scanItem.guardName || 'Unknown',
      scanItem.checkpointName || 'Unknown',
      scanItem.locationText || '',
      scanItem.result === 'failed' ? 'Failed' : 'Passed',
      scanItem.resultDetails?.reason || '',
      toMetersText(scanItem.resultDetails?.gpsAccuracy),
      scanItem.resultDetails?.distanceVsAllowed || 'N/A'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `patrol-report-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const totalScans = scans.length
  const uniqueGuards = new Set(scans.filter(s => s.guardName).map(s => s.guardName)).size
  const uniqueCheckpoints = new Set(scans.filter(s => s.checkpointName).map(s => s.checkpointName)).size

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Reports</h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            View patrol scan history and export reports.
          </p>
        </div>

        {selectionMode ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={deleteRange}
              onChange={(e) => setDeleteRange(e.target.value)}
              className="rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2 text-sm"
            >
              <option value="7d">Last 7 Days</option>
              <option value="1m">Last Month</option>
              <option value="6m">Last 6 Months</option>
              <option value="1y">Last Year</option>
            </select>
            <button
              onClick={exitSelectionMode}
              className="px-4 py-2 rounded-xl border border-[color:var(--border)] text-sm"
            >
              Cancel
            </button>
            <button
              onClick={deleteSelectedScans}
              disabled={!selectedScanIds.length || deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
            >
              <IconTrash size={16} />
              {deleting ? 'Deleting...' : `Delete (${selectedScanIds.length})`}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectionMode(true)}
              disabled={!filteredScans.length}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[color:var(--border)] hover:bg-[color:var(--bg-muted)] transition text-sm disabled:opacity-50"
            >
              <IconCheck size={16} />
              Select
            </button>
            <button
              onClick={exportCSV}
              disabled={!filteredScans.length}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[color:var(--accent)]
                hover:bg-[color:var(--accent-strong)] transition font-medium disabled:opacity-50
                disabled:cursor-not-allowed"
            >
              <IconDownload size={18} />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-[color:var(--text-muted)]">Total Scans</p>
          <p className="text-2xl font-semibold">{totalScans}</p>
        </div>
        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-[color:var(--text-muted)]">Active Guards</p>
          <p className="text-2xl font-semibold">{uniqueGuards}</p>
        </div>
        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-[color:var(--text-muted)]">Checkpoints Visited</p>
          <p className="text-2xl font-semibold">{uniqueCheckpoints}</p>
        </div>
      </div>

      <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-4 shadow-[var(--shadow)]">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm text-[color:var(--text-muted)] mb-1 block">Date Range</label>
            <div className="flex gap-2 flex-col sm:flex-row">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="flex-1 rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                  focus:outline-none focus:border-[color:var(--accent)] text-sm"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
                <option value="all">All Time</option>
              </select>
              {dateRange === 'custom' && (
                <div className="flex gap-2 flex-1">
                  <div className="flex-1">
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                        focus:outline-none focus:border-[color:var(--accent)] text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                        focus:outline-none focus:border-[color:var(--accent)] text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1">
            <label className="text-sm text-[color:var(--text-muted)] mb-1 block">Search</label>
            <div className="relative">
              <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by guard, checkpoint, location, or reason..."
                className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] pl-10 pr-3 py-2
                  focus:outline-none focus:border-[color:var(--accent)] text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl overflow-hidden shadow-[var(--shadow)]">
        {loading ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-[color:var(--text-muted)]">
              <IconLoader2 size={18} className="animate-spin" />
              <span>Loading scans...</span>
            </div>
          </div>
        ) : displayedScans.length > 0 ? (
          <>
            <div className="sm:hidden divide-y divide-[color:var(--border)]">
              {displayedScans.map(scanItem => {
                const selected = selectedScanIds.includes(scanItem.id)
                return (
                  <div
                    key={scanItem.id || `${scanItem.scannedAt}-${scanItem.guardName}`}
                    className={`p-4 space-y-3 ${selectionMode ? 'bg-[color:var(--bg-muted)]/50' : ''}`}
                    onTouchStart={() => onCardPressStart(scanItem.id)}
                    onTouchEnd={onCardPressEnd}
                    onTouchCancel={onCardPressEnd}
                    onMouseDown={() => onCardPressStart(scanItem.id)}
                    onMouseUp={onCardPressEnd}
                    onMouseLeave={onCardPressEnd}
                    onClick={() => {
                      if (selectionMode) toggleScanSelection(scanItem.id)
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <IconCalendar size={15} className="text-[color:var(--text-muted)]" />
                        <span>{formatDate(scanItem.scannedAt)}</span>
                        <IconClock size={14} className="text-[color:var(--text-muted)]" />
                        <span className="text-[color:var(--text-muted)]">{formatTime(scanItem.scannedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectionMode && (
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleScanSelection(scanItem.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4"
                          />
                        )}
                        <span
                          className={`text-xs px-2 py-1 rounded-full border ${
                            scanItem.result === 'failed'
                              ? 'border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                              : 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700'
                          }`}
                        >
                          {scanItem.result === 'failed' ? 'Failed' : 'Passed'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <p><span className="text-[color:var(--text-muted)]">Guard:</span> {scanItem.guardName || 'Unknown Guard'}</p>
                      <p><span className="text-[color:var(--text-muted)]">Checkpoint:</span> {scanItem.checkpointName || 'Unknown Checkpoint'}</p>
                      <p><span className="text-[color:var(--text-muted)]">Location:</span> {scanItem.locationText || 'No location data'}</p>
                    </div>

                    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-muted)] p-3 text-xs space-y-1">
                      <p><span className="text-[color:var(--text-muted)]">Reason:</span> {scanItem.resultDetails.reason}</p>
                      <p><span className="text-[color:var(--text-muted)]">GPS accuracy:</span> {toMetersText(scanItem.resultDetails.gpsAccuracy)}</p>
                      <p><span className="text-[color:var(--text-muted)]">Distance / allowed:</span> {scanItem.resultDetails.distanceVsAllowed}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="bg-[color:var(--bg-muted)]">
                  <tr>
                    {selectionMode && (
                      <th className="text-left px-4 py-3 text-sm font-medium text-[color:var(--text-muted)]">Select</th>
                    )}
                    <th className="text-left px-4 py-3 text-sm font-medium text-[color:var(--text-muted)]">Date & Time</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-[color:var(--text-muted)]">Guard</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-[color:var(--text-muted)]">Checkpoint</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-[color:var(--text-muted)]">Location</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-[color:var(--text-muted)]">Result</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-[color:var(--text-muted)]">Reason</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-[color:var(--text-muted)]">GPS Accuracy</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-[color:var(--text-muted)]">Distance / Allowed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {displayedScans.map(scanItem => {
                    const selected = selectedScanIds.includes(scanItem.id)
                    return (
                      <tr
                        key={scanItem.id || `${scanItem.scannedAt}-${scanItem.guardName}`}
                        className={`hover:bg-[color:var(--bg-muted)] transition-colors ${selectionMode ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (selectionMode) toggleScanSelection(scanItem.id)
                        }}
                      >
                        {selectionMode && (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleScanSelection(scanItem.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <IconCalendar size={16} className="text-[color:var(--text-muted)] flex-shrink-0" />
                            <span className="text-sm">{formatDate(scanItem.scannedAt)}</span>
                            <IconClock size={14} className="text-[color:var(--text-muted)] flex-shrink-0" />
                            <span className="text-sm text-[color:var(--text-muted)]">{formatTime(scanItem.scannedAt)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <IconUser size={16} className="text-[color:var(--text-muted)] flex-shrink-0" />
                            <span className="text-sm truncate max-w-[150px]">{scanItem.guardName || 'Unknown Guard'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <IconMapPin size={16} className="text-[color:var(--accent)] flex-shrink-0" />
                            <span className="text-sm truncate max-w-[180px]">{scanItem.checkpointName || 'Unknown Checkpoint'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-[color:var(--text-muted)] max-w-[220px]">{scanItem.locationText || 'No location data'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full border ${
                              scanItem.result === 'failed'
                                ? 'border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                                : 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700'
                            }`}
                          >
                            {scanItem.result === 'failed' ? 'Failed' : 'Passed'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-[color:var(--text-muted)] max-w-[280px]">{scanItem.resultDetails.reason}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-[color:var(--text-muted)]">{toMetersText(scanItem.resultDetails.gpsAccuracy)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-[color:var(--text-muted)]">{scanItem.resultDetails.distanceVsAllowed}</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-[color:var(--text-muted)]">
            {selectionMode
              ? 'No reports found in the selected delete range.'
              : (scans.length === 0 ? 'No scans found for the selected period.' : 'No results match your search.')}
          </div>
        )}

        {!loading && displayedScans.length > 0 && (
          <div className="px-4 py-3 border-t border-[color:var(--border)] bg-[color:var(--bg-muted)] text-sm text-[color:var(--text-muted)]">
            Showing {displayedScans.length} of {selectionMode ? deletableScans.length : scans.length} scans
            {!selectionMode && ' (long-press a report on mobile to select and delete)'}
          </div>
        )}
      </div>
    </div>
  )
}
