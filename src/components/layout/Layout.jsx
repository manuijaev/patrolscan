import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { syncOfflineScans } from '../../offline/snyc'

export default function Layout() {
  useEffect(() => {
    const onOnline = () => {
      syncOfflineScans()
    }

    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])
  return (
    <div className="h-screen w-screen overflow-hidden bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="flex h-full">
        <Sidebar />

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* subtle ambient glow */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(28,202,216,0.15),transparent_60%)]" />

          <Topbar />

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
