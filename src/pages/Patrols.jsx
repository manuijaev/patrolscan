import { useEffect, useState } from 'react'
import api from '../api/axios'

function formatTime(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  return date.toLocaleString()
}

export default function Patrols() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadLogs() {
      try {
        const res = await api.get('/patrols')
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
        <button className="px-4 py-2 rounded-xl bg-[color:var(--accent)]
          hover:bg-[color:var(--accent-strong)] transition text-sm font-semibold">
          Export
        </button>
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
                  <th className="py-2 pr-4 font-medium">Guard ID</th>
                  <th className="py-2 pr-4 font-medium">Checkpoint</th>
                  <th className="py-2 pr-4 font-medium">Device Time</th>
                  <th className="py-2 pr-4 font-medium">Server Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr
                    key={log.id}
                    className="border-b border-[color:var(--border)]/70 text-[color:var(--text)]"
                  >
                    <td className="py-3 pr-4">{log.guardId}</td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {log.checkpointCode}
                    </td>
                    <td className="py-3 pr-4">
                      {formatTime(log.scannedAt)}
                    </td>
                    <td className="py-3 pr-4">
                      {formatTime(log.serverAt)}
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
