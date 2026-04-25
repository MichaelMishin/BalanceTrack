import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  User,
  Settings,
  Tags,
  Landmark,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/stores/auth-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { key: 'dashboard', path: '/', icon: LayoutDashboard },
  { key: 'personal', path: '/personal', icon: User },
  { key: 'categories', path: '/categories', icon: Tags },
  { key: 'accounts', path: '/accounts', icon: Landmark },
  { key: 'settings', path: '/settings', icon: Settings },
] as const

export function Sidebar() {
  const { t } = useTranslation()
  const { signOut } = useAuth()

  return (
    <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          B
        </div>
        <span className="text-lg font-semibold">{t('app.name')}</span>
      </div>

      <Separator className="bg-sidebar-border" />

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ key, path, icon: Icon }) => (
          <NavLink
            key={key}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                'cursor-pointer',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70'
              )
            }
            end={path === '/'}
          >
            <Icon className="h-5 w-5" />
            {t(`nav.${key}`)}
          </NavLink>
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer"
          onClick={() => signOut()}
        >
          <LogOut className="h-5 w-5" />
          {t('nav.logout')}
        </Button>
      </div>
    </aside>
  )
}
