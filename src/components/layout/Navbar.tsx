import { useTranslation } from 'react-i18next'
import { useHousehold } from '@/stores/household-context'
import { useAuth } from '@/stores/auth-context'
import { ChevronLeft, ChevronRight, Menu, Moon, Sun, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, User, Settings, Tags, Landmark, LogOut, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function Navbar() {
  const { t, i18n } = useTranslation()
  const { period, timeframe, goToPreviousPeriod, goToNextPeriod, goToCurrentPeriod, setTimeframe } = useHousehold()
  const { signOut } = useAuth()
  const [isDark, setIsDark] = useState(true)

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('light')
  }

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'he' : 'en'
    i18n.changeLanguage(newLang)
    document.documentElement.dir = newLang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = newLang
  }

  const mobileNavItems = [
    { key: 'dashboard', path: '/', icon: LayoutDashboard },
    { key: 'personal', path: '/personal', icon: User },
    { key: 'transactions', path: '/transactions', icon: Receipt },
    { key: 'categories', path: '/categories', icon: Tags },
    { key: 'accounts', path: '/accounts', icon: Landmark },
    { key: 'settings', path: '/settings', icon: Settings },
  ] as const

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 md:px-6 animate-slide-down">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden cursor-pointer h-9 w-9">
            <Menu className="h-[18px] w-[18px]" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] bg-sidebar p-0">
          <div className="flex h-16 items-center gap-3 px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-400 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20">
              <span className="text-xs">BT</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">{t('app.name')}</span>
          </div>
          <nav className="space-y-1 px-3 py-2">
            {mobileNavItems.map(({ key, path, icon: Icon }) => (
              <NavLink
                key={key}
                to={path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    'hover:bg-sidebar-accent/80',
                    isActive ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground/60'
                  )
                }
                end={path === '/'}
              >
                <Icon className="h-[18px] w-[18px]" />
                {t(`nav.${key}`)}
              </NavLink>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
              onClick={() => signOut()}
            >
              <LogOut className="h-[18px] w-[18px]" />
              {t('nav.logout')}
            </Button>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Period navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousPeriod}
          className="cursor-pointer h-8 w-8 rounded-lg"
          aria-label={t('period.previous')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <button
          onClick={goToCurrentPeriod}
          className="text-sm font-semibold hover:text-primary transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-muted"
        >
          {period.label}
        </button>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextPeriod}
          className="cursor-pointer h-8 w-8 rounded-lg"
          aria-label={t('period.next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Badge variant="secondary" className="cursor-pointer capitalize text-xs px-2.5 py-0.5 rounded-full font-medium">
              {t(`settings.${timeframe}`)}
            </Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setTimeframe('weekly')} className="cursor-pointer">
              {t('settings.weekly')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimeframe('biweekly')} className="cursor-pointer">
              {t('settings.biweekly')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimeframe('monthly')} className="cursor-pointer">
              {t('settings.monthly')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLanguage}
          className="cursor-pointer h-8 w-8 rounded-lg"
          aria-label="Toggle language"
        >
          <Globe className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="cursor-pointer h-8 w-8 rounded-lg"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  )
}
