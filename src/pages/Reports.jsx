import { useEffect, useState } from 'react'
import {
  IconDownload,
  IconCalendar,
  IconUser,
  IconMapPin,
  IconClock,
  IconSearch,
  IconFilter
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

  async function loadScans() {
    setLoading(true)
    try {
      const token = getToken()
      let startDate, endDate

      const now = new Date()
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()
          endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString()
          break
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7)).toISOString()
          endDate = new Date().toISOString()
          break
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString()
          endDate = new Date().toISOString()
          break
        case 'custom':
          startDate = new Date(customStart).toISOString()
          endDate = new Date(customEnd).toISOString()
          break
        default:
          startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()
          endDate = new Date().toISOString()
      }

      const res = await api.get(`/scans/date-range?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setScans(res.data)
    } catch (err) {
      console.error('Failed to load scans', err)
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
    const date = new Date(isoString)
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  function formatTime(isoString) {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function exportCSV() {
    const headers = ['Date', 'Time', 'Guard', 'Checkpoint', 'Location']
    const rows = filteredScans.map(scan => [
      formatDate(scan.scannedAt),
      formatTime(scan.scannedAt),
      scan.guardName,
      scan.checkpointName,
      ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `patrol-report-${new Date().toISOString().split('T')[0]}.csv`
    link.href = url
    link.click()
  }

  const filteredScans = scans.filter(scan => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      scan.guardName?.toLowerCase().includes(term) ||
      scan.checkpointName?.toLowerCase().includes(term)
    )
  })

  // Stats
  const totalScans = scans.length
  const uniqueGuards = new Set(scans.map(s => scan.guardName)).size
  const uniqueCheckpoints = new Set(scans.map(s => scan.checkpointName)).size

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
            hover:bg-[color:var(--accent-strong)] transition font-medium disabled:opacity-50"
        >
          <IconDownload size={18} />
          Export CSV
        </button>
      </div>

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
            <div className="flex gap-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="flex-1 rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                  focus:outline-none focus:border-[color:var(--accent)]"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
              {dateRange === 'custom' && (
                <>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                      focus:outline-none focus:border-[color:var(--accent)]"
                  />
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] px-3 py-2
                      focus:outline-none focus:border-[color:var(--accent)]"
                  />
                </>
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
                placeholder="Search by guard or checkpoint..."
                className="w-full rounded-xl bg-[color:var(--bg-muted)] border border-[color:var(--border)] pl-10 pr-3 py-2
                  focus:outline-none focus:border-[color:var(--accent)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scans Table */}
      <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl overflow-hidden shadow-[var(--shadow)]">
        {loading ? (
          <div className="p-8 text-center text-[color:var(--text-muted)]">
            Loading scans...
          </div>
        ) : filteredScans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {filteredScans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-[color:var(--bg-muted)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <IconCalendar size={16} className="text-[color:var(--text-muted)]" />
                        <span className="text-sm">{formatDate(scan.scannedAt)}</span>
                        <IconClock size={14} className="text-[color:var(--text-muted)]" />
                        <span className="text-sm text-[color:var(--text-muted)]">
                          {formatTime(scan.scannedAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <IconUser size={16} className="text-[color:var(--text-muted)]" />
                        <span className="text-sm">{scan.guardName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <IconMapPin size={16} className="text-[color:var(--accent)]" />
                        <span className="text-sm">{scan.checkpointName}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-[color:var(--text-muted)]">
            No scans found for the selected period.
          </div>
        )}
      </div>
    </div>
  )
}
