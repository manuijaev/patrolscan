import { useEffect, useState } from 'react'
import {
  IconDownload,
  IconCalendar,
  IconUser,
  IconMapPin,
  IconClock,
  IconSearch,
  IconFilter,
  IconLoader2
} from '@tabler/icons-react'
import api from '../api/axios'
import { getToken } from '../auth/authStore'

export default function Reports() {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')

  async function loadScans() {
    setLoading(true)
    setError('')
    try {
      const token = getToken()
      if (!token) {
        setError('No authentication token found')
        return
      }

      let startDate, endDate
      const now = new Date()

      switch (dateRange) {
        case 'all':
          startDate = new Date('2020-01-01').toISOString()
          endDate = new Date('2030-12-31').toISOString()
          break
        case 'today':
          const todayStart = new Date(now)
          todayStart.setHours(0, 0, 0, 0)
          const todayEnd = new Date(now)
          todayEnd.setHours(23, 59, 59, 999)
          startDate = todayStart.toISOString()
          endDate = todayEnd.toISOString()
          break
        case 'week':
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - 7)
          startDate = weekStart.toISOString()
          endDate = now.toISOString()
          break
        case 'month':
          const monthStart = new Date(now)
          monthStart.setMonth(now.getMonth() - 1)
          startDate = monthStart.toISOString()
          endDate = now.toISOString()
          break
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
      setScans(res.data || [])
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

  function formatDate(isoString) {
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    } catch (err) {
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
    } catch (err) {
      return 'Invalid time'
    }
  }

  function exportCSV() {
    if (filteredScans.length === 0) return

    const headers = ['Date', 'Time', 'Guard', 'Checkpoint', 'Location']
    const rows = filteredScans.map(scanItem => [
      formatDate(scanItem.scannedAt),
      formatTime(scanItem.scannedAt),
      scanItem.guardName || 'Unknown',
      scanItem.checkpointName || 'Unknown',
      scanItem.location || ''
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

  const filteredScans = scans.filter(scanItem => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      (scanItem.guardName || '').toLowerCase().includes(term) ||
      (scanItem.checkpointName || '').toLowerCase().includes(term) ||
      (scanItem.location || '').toLowerCase().includes(term)
    )
  })

  // Stats with safe data access
  const totalScans = scans.length
  const uniqueGuards = new Set(scans.filter(s => s.guardName).map(s => s.guardName)).size
  const uniqueCheckpoints = new Set(scans.filter(s => s.checkpointName).map(s => s.checkpointName)).size

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Reports</h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            View patrol scan history and export reports.
          </p>
        </div>
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

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
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

      {/* Filters */}
      <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-4 shadow-[var(--shadow)]">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Date Range */}
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

          {/* Search */}
          <div className="flex-1">
            <label className="text-sm text-[color:var(--text-muted)] mb-1 block">Search</label>
            <div className="relative">
              <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by guard, checkpoint, or location..."
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

      {/* Scans Table */}
      <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl overflow-hidden shadow-[var(--shadow)]">
        {loading ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-[color:var(--text-muted)]">
              <IconLoader2 size={18} className="animate-spin" />
              <span>Loading scans...</span>
            </div>
          </div>
        ) : filteredScans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-[color:var(--bg-muted)]">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[color:var(--text-muted)]">
                    Date & Time
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[color:var(--text-muted)]">
                    Guard
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[color:var(--text-muted)]">
                    Checkpoint
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[color:var(--text-muted)]">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {filteredScans.map((scanItem) => (
                  <tr 
                    key={scanItem.id || `${scanItem.scannedAt}-${scanItem.guardName}`} 
                    className="hover:bg-[color:var(--bg-muted)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <IconCalendar size={16} className="text-[color:var(--text-muted)] flex-shrink-0" />
                        <span className="text-sm">{formatDate(scanItem.scannedAt)}</span>
                        <IconClock size={14} className="text-[color:var(--text-muted)] flex-shrink-0" />
                        <span className="text-sm text-[color:var(--text-muted)]">
                          {formatTime(scanItem.scannedAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <IconUser size={16} className="text-[color:var(--text-muted)] flex-shrink-0" />
                        <span className="text-sm truncate max-w-[150px]">
                          {scanItem.guardName || 'Unknown Guard'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <IconMapPin size={16} className="text-[color:var(--accent)] flex-shrink-0" />
                        <span className="text-sm truncate max-w-[150px]">
                          {scanItem.checkpointName || 'Unknown Checkpoint'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-[color:var(--text-muted)] truncate max-w-[200px]">
                        {scanItem.location || 'No location data'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-[color:var(--text-muted)]">
            {scans.length === 0 ? 'No scans found for the selected period.' : 'No results match your search.'}
          </div>
        )}

        {/* Pagination or Count */}
        {!loading && filteredScans.length > 0 && (
          <div className="px-4 py-3 border-t border-[color:var(--border)] bg-[color:var(--bg-muted)] text-sm text-[color:var(--text-muted)]">
            Showing {filteredScans.length} of {scans.length} scans
          </div>
        )}
      </div>
    </div>
  )
}