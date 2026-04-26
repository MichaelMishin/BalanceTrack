import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import * as icons from 'lucide-react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// Curated finance-relevant icons
const FINANCE_ICONS = [
  'Home', 'Car', 'Fuel', 'ShoppingCart', 'ShoppingBag', 'CreditCard',
  'Banknote', 'Wallet', 'PiggyBank', 'TrendingUp', 'TrendingDown',
  'Heart', 'HeartPulse', 'Stethoscope', 'Pill', 'Baby',
  'Utensils', 'Coffee', 'Wine', 'Beer', 'Pizza', 'Apple',
  'Shirt', 'Scissors', 'Gem',
  'Bus', 'Train', 'Plane', 'Bike', 'Ship',
  'Wifi', 'Smartphone', 'Tv', 'Monitor', 'Gamepad2',
  'Zap', 'Droplets', 'Flame', 'Snowflake', 'Sun',
  'GraduationCap', 'BookOpen', 'Briefcase', 'Building2',
  'Dumbbell', 'Trophy', 'Music', 'Camera', 'Film',
  'Gift', 'PartyPopper', 'Cake', 'Star',
  'Dog', 'Cat', 'Trees', 'Mountain', 'Palmtree',
  'Receipt', 'FileText', 'Calculator', 'Percent',
  'Shield', 'Lock', 'Key',
  'Wrench', 'Hammer', 'PaintBucket',
  'Package', 'Truck', 'Store',
  'CircleDollarSign', 'HandCoins', 'Landmark',
  'Cigarette', 'Sparkles', 'Ticket',
] as const

type IconComponent = React.FC<{ className?: string }>

function getIconComponent(name: string): IconComponent | null {
  const icon = (icons as Record<string, unknown>)[name]
  if (!icon) return null
  // lucide-react v1+ exports forwardRef objects, not plain functions
  if (typeof icon === 'function' || (typeof icon === 'object' && '$$typeof' in (icon as object))) {
    return icon as unknown as IconComponent
  }
  return null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentIcon: string | null
  onSelect: (icon: string) => void
}

export function IconPicker({ open, onOpenChange, currentIcon, onSelect }: Props) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return FINANCE_ICONS as unknown as string[]
    const q = search.toLowerCase()
    return (FINANCE_ICONS as unknown as string[]).filter(name =>
      name.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('categories.pickIcon')}
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('categories.searchIcons')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ScrollArea className="h-64">
          <div className="grid grid-cols-6 gap-2">
            {filteredIcons.map(name => {
              const Icon = getIconComponent(name)
              if (!Icon) return null
              return (
                <Button
                  key={name}
                  variant="ghost"
                  className={cn(
                    "h-11 w-11 p-0 cursor-pointer transition-all",
                    currentIcon === name && "bg-primary/10 ring-2 ring-primary"
                  )}
                  onClick={() => {
                    onSelect(name)
                    onOpenChange(false)
                  }}
                  title={name}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              )
            })}
          </div>
          {filteredIcons.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              {t('transactions.noResults')}
            </p>
          )}
        </ScrollArea>
      </div>
    </FormDialog>
  )
}

export function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  if (!name) return null
  const Icon = getIconComponent(name)
  if (!Icon) return null
  return <Icon className={className} />
}
