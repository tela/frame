import { Outlet } from '@tanstack/react-router'
import { NavSidebar } from '@/components/nav-sidebar'
import { StylistDrawerProvider } from '@/components/stylist-drawer'

export function RootLayout() {
  return (
    <StylistDrawerProvider>
      <div className="min-h-screen bg-background flex">
        <NavSidebar />
        <main className="flex-1 flex flex-col h-screen overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </StylistDrawerProvider>
  )
}
