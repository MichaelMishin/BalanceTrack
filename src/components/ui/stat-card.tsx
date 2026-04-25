import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard, CardHeader, CardTitle, CardContent } from '@/components/ui/glass-card'

interface StatCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  colorScheme?: 'success' | 'destructive' | 'primary' | 'warning'
  subtitle?: string
  className?: string
}

const colorMap = {
  success: {
    gradient: 'from-success to-transparent',
    iconBg: 'bg-success/10',
    iconText: 'text-success',
    valueText: 'text-success',
  },
  destructive: {
    gradient: 'from-destructive to-transparent',
    iconBg: 'bg-destructive/10',
    iconText: 'text-destructive',
    valueText: 'text-destructive',
  },
  primary: {
    gradient: 'from-primary to-transparent',
    iconBg: 'bg-primary/10',
    iconText: 'text-primary',
    valueText: 'text-foreground',
  },
  warning: {
    gradient: 'from-warning to-transparent',
    iconBg: 'bg-warning/10',
    iconText: 'text-warning',
    valueText: 'text-warning',
  },
}

export function StatCard({
  title,
  value,
  icon: Icon,
  colorScheme = 'primary',
  subtitle,
  className,
}: StatCardProps) {
  const colors = colorMap[colorScheme]

  return (
    <GlassCard variant="interactive" className={cn('overflow-hidden relative', className)}>
      <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${colors.gradient}`} />
      <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', colors.iconBg)}>
          <Icon className={cn('h-4 w-4', colors.iconText)} />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <p className={cn('text-2xl font-bold tracking-tight tabular-nums', colors.valueText)}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </GlassCard>
  )
}
