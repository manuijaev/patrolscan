const stats = [
  { label: 'Patrols Today', value: 24 },
  { label: 'Missed Patrols', value: 2 },
  { label: 'Active Guards', value: 6 },
]

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Command Center</h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            Live status across active sites and guards.
          </p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-[color:var(--accent)]
          hover:bg-[color:var(--accent-strong)] transition text-sm font-semibold">
          View Live Patrols
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="
              relative rounded-2xl p-5 lg:p-6
              bg-[color:var(--panel)] backdrop-blur-xl
              border border-[color:var(--border)]
              hover:border-[color:var(--accent)]/40 transition
            "
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[color:var(--accent)]/15 to-transparent opacity-0 hover:opacity-100 transition pointer-events-none" />
            <p className="text-[color:var(--text-muted)] text-sm relative z-10">
              {stat.label}
            </p>
            <p className="text-3xl lg:text-4xl font-bold mt-2 relative z-10">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Live Patrol Activity</h3>
            <span className="text-xs text-[color:var(--text-muted)]">Updated just now</span>
          </div>
          <div className="space-y-3">
            {[
              { guard: 'Guard One', checkpoint: 'Gate A', time: '2m ago' },
              { guard: 'Guard Two', checkpoint: 'Warehouse', time: '7m ago' },
              { guard: 'Guard Three', checkpoint: 'Loading Dock', time: '12m ago' },
            ].map(item => (
              <div
                key={`${item.guard}-${item.checkpoint}`}
                className="flex items-center justify-between rounded-xl border border-[color:var(--border)]
                  bg-[color:var(--bg-muted)] px-4 py-3"
              >
                <div>
                  <p className="font-medium">{item.guard}</p>
                  <p className="text-xs text-[color:var(--text-muted)]">{item.checkpoint}</p>
                </div>
                <span className="text-xs text-[color:var(--text-muted)]">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[color:var(--panel)] border border-[color:var(--border)] rounded-2xl p-6 shadow-[var(--shadow)]">
          <h3 className="font-semibold mb-4">Today’s Alerts</h3>
          <div className="space-y-3">
            {[
              'Checkpoint missed: Gate A',
              'Guard Two inactive for 25 mins',
              'Route delay: Night Shift',
            ].map(alert => (
              <div
                key={alert}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-muted)] px-4 py-3 text-sm"
              >
                {alert}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
