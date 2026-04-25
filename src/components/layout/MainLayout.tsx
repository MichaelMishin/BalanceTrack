import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'

export function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="relative flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {/* Subtle gradient orbs in background */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-chart-5/5 blur-3xl" />
          </div>
          <div className="relative">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
