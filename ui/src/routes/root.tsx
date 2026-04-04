import { Outlet } from '@tanstack/react-router'
import { NavSidebar } from '@/components/nav-sidebar'
import { StylistDrawerProvider } from '@/components/stylist-drawer'
import { ToastContainer } from '@/components/toast'
import { ErrorBoundary } from '@/components/error-boundary'

export function RootLayout() {
  return (
    <StylistDrawerProvider>
      <div className="min-h-screen bg-background flex">
        <NavSidebar />
        <main className="flex-1 flex flex-col h-screen overflow-y-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <ToastContainer />
    </StylistDrawerProvider>
  )
}
