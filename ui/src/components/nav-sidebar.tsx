import { Link, useRouterState } from '@tanstack/react-router'

const navItems = [
  { to: '/characters', icon: 'group', label: 'Character Library' },
  { to: '/media', icon: 'photo_library', label: 'Media Library' },
  { to: '/datasets', icon: 'dataset', label: 'Datasets' },
  { to: '/search', icon: 'search', label: 'Image Search' },
  { to: '/templates', icon: 'article', label: 'Prompt Templates' },
  { to: '/import', icon: 'upload_file', label: 'Import' },
] as const

const footerItems = [
  { to: '/tags', icon: 'sell', label: 'Tag Manager' },
] as const

export function NavSidebar() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const isActive = (to: string) => {
    if (to === '/characters') {
      return currentPath === '/characters' || currentPath.startsWith('/characters/')
    }
    return currentPath.startsWith(to)
  }

  return (
    <nav className="w-[240px] flex-shrink-0 border-r border-border-subtle h-screen sticky top-0 flex flex-col pt-8 pb-8 bg-background z-10">
      <div className="px-8 mb-12">
        <h1 className="font-display text-2xl tracking-display">Frame</h1>
      </div>

      <div className="flex flex-col gap-8 px-8 flex-grow">
        {navItems.map((item) => {
          const active = isActive(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`text-ui text-[13px] transition-colors flex items-center gap-3 ${
                active
                  ? 'text-primary border-l border-primary -ml-8 pl-[31px]'
                  : 'text-muted hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </div>

      <div className="px-8 mt-auto">
        {footerItems.map((item) => {
          const active = isActive(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`text-ui text-[13px] transition-colors flex items-center gap-3 ${
                active
                  ? 'text-primary border-l border-primary -ml-8 pl-[31px]'
                  : 'text-muted hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
