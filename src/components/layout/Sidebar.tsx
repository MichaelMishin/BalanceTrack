import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Settings,
  Tags,
  Landmark,
  LogOut,
  Sparkles,
  Receipt,
  CalendarClock,
} from 'lucide-react'
import { useAuth } from '@/stores/auth-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { key: 'dashboard', path: '/', icon: LayoutDashboard },
  { key: 'transactions', path: '/transactions', icon: Receipt },
  { key: 'recurring', path: '/recurring', icon: CalendarClock },
  { key: 'categories', path: '/categories', icon: Tags },
  { key: 'accounts', path: '/accounts', icon: Landmark },
  { key: 'settings', path: '/settings', icon: Settings },
] as const

export function Sidebar() {
  const { t } = useTranslation()
  const { signOut } = useAuth()

  return (
    <aside className="hidden w-[260px] flex-col bg-sidebar/80 backdrop-blur-xl text-sidebar-foreground md:flex border-r border-sidebar-border/50">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-400 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="text-lg font-bold tracking-tight">{t('app.name')}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ key, path, icon: Icon }) => (
          <NavLink
            key={key}
            to={path}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                'hover:bg-sidebar-accent/80',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                'cursor-pointer',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
              )
            }
            end={path === '/'}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary" />
                )}
                <Icon className={cn(
                  "h-[18px] w-[18px] transition-colors duration-200",
                  isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                )} />
                {t(`nav.${key}`)}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 mb-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer transition-colors duration-200"
          onClick={() => signOut()}
        >
          <LogOut className="h-[18px] w-[18px]" />
          {t('nav.logout')}
        </Button>
      </div>
    </aside>
  )
}
