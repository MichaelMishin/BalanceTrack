import { useTranslation } from 'react-i18next'
import { GlassCard as Card, CardContent, CardHeader, CardTitle } from '@/components/ui/glass-card'
import { cn } from '@/lib/utils'

interface Props {
  income: number
  expenses: number
  savingsTargetPct: number
}

export function SavingsGauge({ income, expenses, savingsTargetPct }: Props) {
  const { t } = useTranslation()

  const net = income - expenses
  const percentage = income > 0 ? Math.round((net / income) * 100) : 0
  const isOnTrack = percentage >= savingsTargetPct
  const isOverspending = net < 0

  // Gauge angle: map -100% to 100% onto 0 to 180 degrees
  const clampedPct = Math.max(-100, Math.min(100, percentage))
  const angle = ((clampedPct + 100) / 200) * 180

  return (
    <Card className="card-hover overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.budgetHealth')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-4">
        {/* Gauge SVG */}
        <div className="relative h-24 w-48">
          <svg viewBox="0 0 200 110" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="var(--color-muted)"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Colored arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={isOverspending ? 'var(--color-destructive)' : isOnTrack ? 'var(--color-success)' : 'var(--color-warning)'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(angle / 180) * 251.3} 251.3`}
            />
            {/* Needle */}
            <line
              x1="100"
              y1="100"
              x2={100 + 60 * Math.cos(((180 - angle) * Math.PI) / 180)}
              y2={100 - 60 * Math.sin(((180 - angle) * Math.PI) / 180)}
              stroke="var(--color-foreground)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="4" fill="var(--color-foreground)" />
          </svg>
        </div>

        <p className={cn(
          'text-2xl font-bold',
          isOverspending && 'text-destructive',
          isOnTrack && 'text-success',
          !isOverspending && !isOnTrack && 'text-warning',
        )}>
          {percentage}%
        </p>

        <p className="text-sm text-muted-foreground">
          {isOverspending
            ? t('dashboard.overspending')
            : isOnTrack
              ? t('dashboard.onTrack')
              : `${savingsTargetPct}% ${t('categories.savings')} ${t('settings.savingsTarget').toLowerCase()}`
          }
        </p>
      </CardContent>
    </Card>
  )
}
