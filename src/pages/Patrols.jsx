import { useEffect, useState } from 'react'
import {
  IconDownload,
} from '@tabler/icons-react'
import api from '../api/axios'
import { getToken } from '../auth/authStore'
import { exportPatrolReport } from '../utils/exportReport'

function formatTime(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  return date.toLocaleString()
}

export default function Patrols() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

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

  function toMetersText(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A'
    return `${value.toFixed(2)}m`
  }

  function exportCSV() {
    if (logs.length === 0) return

    const headers = ['Date', 'Time', 'Guard', 'Checkpoint', 'Result', 'Reason', 'GPS Accuracy', 'Distance / Allowed']
    const rows = logs.map(scanItem => [
      formatDate(scanItem.scannedAt),
      formatTime(scanItem.scannedAt),
      scanItem.guardName || 'Unknown',
      scanItem.checkpointName || 'Unknown',
      scanItem.result === 'failed' ? 'Failed' : 'Passed',
      scanItem.failureReason || '',
      toMetersText(scanItem.location?.accuracy),
      scanItem.location?.computedDistanceMeters !== undefined
        ? `${toMetersText(scanItem.location.computedDistanceMeters)} / ${toMetersText(scanItem.location.allowedRadius)}`
        : 'N/A'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `patrol-logs-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function exportPDF() {
    if (logs.length === 0) return

    const normalizedLogs = logs.map(scanItem => ({
      ...scanItem,
      guard: scanItem.guardName,
      checkpoint: scanItem.checkpointName,
      Date: formatDate(scanItem.scannedAt),
      Time: formatTime(scanItem.scannedAt),
      Reason: scanItem.failureReason || (scanItem.result === 'failed' ? 'Validation failed' : 'Passed'),
      'GPS Accuracy': scanItem.location?.accuracy,
      Result: scanItem.result === 'failed' ? 'Failed' : 'Passed'
    }))

    exportPatrolReport(normalizedLogs, {
      title: 'Patrol Logs Report',
      dateRange: 'All Time',
      generatedBy: 'PatrolScan Admin',
      filters: []
    })
  }

  useEffect(() => {
    let active = true

    async function loadLogs() {
      try {
        const token = getToken()
        const res = await api.get('/scans', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (active) setLogs(res.data)
      } catch (err) {
        console.error('Failed to load patrols', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadLogs()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Patrol Logs</h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            Review every scan with server-verified timestamps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportPDF}
            disabled={!logs.length}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white
            hover:bg-red-700 transition font-medium disabled:opacity-50
            disabled:cursor-not-allowed"
          >
            <IconDownload size={18} />
            Export PDF
          </button>
          <button
            onClick={exportCSV}
            disabled={!logs.length}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[color:var(--accent)]
            hover:bg-[color:var(--accent-strong)] transition font-medium disabled:opacity-50
            disabled:cursor-not-allowed"
          >
            <IconDownload size={18} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 shadow-[var(--shadow)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-[color:var(--text-muted)]">
            {logs.length} total
          </span>
          <span className="text-xs text-[color:var(--text-muted)]">
            Updated just now
          </span>
        </div>

        {loading && (
          <div className="text-sm text-[color:var(--text-muted)]">Loading…</div>
        )}

        {!loading && !logs.length && (
          <div className="text-sm text-[color:var(--text-muted)]">
            No scans yet.
          </div>
        )}

        {!!logs.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[color:var(--text-muted)] border-b border-[color:var(--border)]">
                  <th className="py-2 pr-4 font-medium">Time</th>
                  <th className="py-2 pr-4 font-medium">Guard</th>
                  <th className="py-2 pr-4 font-medium">Checkpoint</th>
                  <th className="py-2 pr-4 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr
                    key={log.id}
                    className="border-b border-[color:var(--border)]/70 text-[color:var(--text)]"
                  >
                    <td className="py-3 pr-4">
                      {formatTime(log.scannedAt)}
                    </td>
                    <td className="py-3 pr-4">{log.guardName}</td>
                    <td className="py-3 pr-4">{log.checkpointName}</td>
                    <td className="py-3 pr-4 text-xs text-[color:var(--text-muted)]">
                      {log.result === 'failed' ? 'Failed' : 'Passed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
