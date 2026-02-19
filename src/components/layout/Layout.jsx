import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { syncOfflineScans } from '../../offline/snyc'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const onOnline = () => {
      syncOfflineScans()
    }

    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])
  return (
    <div className="min-h-screen w-full overflow-hidden bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Mobile sidebar drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <button
              type="button"
              className="flex-1 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            <Sidebar
              variant="mobile"
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
          {/* subtle ambient glow */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(28,202,216,0.15),transparent_60%)]" />

          <Topbar onToggleSidebar={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto relative z-0">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
