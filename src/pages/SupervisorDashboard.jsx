import Dashboard from './Dashboard'

export default function SupervisorDashboard() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 text-slate-700 shadow-[var(--shadow)]">
        <h2 className="text-lg font-semibold text-blue-700">Supervisor Command Center</h2>
        <p className="text-sm text-blue-600">
          View the same analytics as the admin dashboard with a focus on your assigned guards and patrols.
        </p>
      </div>
      <Dashboard />
    </div>
  )
}
