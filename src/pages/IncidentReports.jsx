import { useMemo, useState } from 'react'
import {
  IconAlertCircle,
  IconClipboardList,
} from '@tabler/icons-react'
import Incidents from './Incidents'
import Reports from './Reports'

const VIEWS = [
  {
    key: 'reports',
    label: 'Reporting',
    description: 'Document all guard scans, filter by date, and export CSV summaries.',
    icon: IconClipboardList,
  },
  {
    key: 'incidents',
    label: 'Incidents',
    description: 'Review guard-submitted incidents, their notes, and captured photos.',
    icon: IconAlertCircle,
  },
]

export default function IncidentReports() {
  const [activeView, setActiveView] = useState('reports')
  const activeDetails = useMemo(() => VIEWS.find(view => view.key === activeView) || VIEWS[0], [activeView])

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Incident &amp; Reports</h2>
          <p className="text-sm text-[color:var(--text-muted)]">
            Choose whether to focus on exports and patrol scan documentation or browse
            the incident timeline with photos and notes.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {VIEWS.map(view => {
            const isActive = activeView === view.key
            const Icon = view.icon
            return (
              <button
                key={view.key}
                type="button"
                onClick={() => setActiveView(view.key)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border-transparent bg-[color:var(--accent)] text-white shadow-[0_0_20px_rgba(28,202,216,0.25)]'
                    : 'border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] hover:border-[color:var(--accent)] hover:text-[color:var(--text)]'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-white' : 'text-[color:var(--text-muted)]'} />
                {view.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--text-muted)]">
        <div className="flex items-center gap-2 text-[color:var(--text)]">
          <activeDetails.icon size={18} className="text-[color:var(--accent)]" />
          <span className="font-semibold">{activeDetails.label}</span>
        </div>
        <p className="mt-1 text-sm">{activeDetails.description}</p>
      </div>

      <div className={activeView === 'reports' ? 'block' : 'hidden'}>
        <Reports showHeading={false} />
      </div>
      <div className={activeView === 'incidents' ? 'block' : 'hidden'}>
        <Incidents showHeading={false} />
      </div>
    </div>
  )
}
