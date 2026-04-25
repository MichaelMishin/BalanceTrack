import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useTranslation } from 'react-i18next'
import { GlassCard as Card, CardContent, CardHeader, CardTitle } from '@/components/ui/glass-card'
import { formatCurrency } from '@/lib/utils'
import type { Category, Transaction } from '@/types/database'

interface ExpensesByCategory {
  category: Category
  transactions: Transaction[]
  total: number
}

interface Props {
  expensesByCategory: Record<string, ExpensesByCategory>
  currency: string
  locale?: string
}

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
  'var(--color-chart-7)',
  'var(--color-chart-8)',
]

export function ExpensePieChart({ expensesByCategory, currency, locale = 'en-US' }: Props) {
  const { t } = useTranslation()

  const sortedCategories = Object.values(expensesByCategory)
    .sort((a, b) => b.total - a.total)

  // Group smaller categories into "Other" if more than 8
  let chartData: { name: string; value: number }[]
  if (sortedCategories.length <= 8) {
    chartData = sortedCategories.map(c => ({
      name: c.category.name,
      value: c.total,
    }))
  } else {
    const top7 = sortedCategories.slice(0, 7)
    const rest = sortedCategories.slice(7)
    const otherTotal = rest.reduce((sum, c) => sum + c.total, 0)
    chartData = [
      ...top7.map(c => ({ name: c.category.name, value: c.total })),
      { name: t('categories.other'), value: otherTotal },
    ]
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.expenseBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('dashboard.noTransactions')}
          </p>
        </CardContent>
      </Card>
    )
  }

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('dashboard.expenseBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value), currency, locale)}
                contentStyle={{
                  backgroundColor: 'var(--color-popover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--color-popover-foreground)',
                }}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Accessible data table */}
        <table className="mt-4 w-full text-sm" role="table">
          <thead className="sr-only">
            <tr>
              <th>{t('transactions.category')}</th>
              <th>{t('transactions.amount')}</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((item, i) => (
              <tr key={item.name} className="flex items-center justify-between py-1">
                <td className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </td>
                <td className="text-right font-medium">
                  {formatCurrency(item.value, currency, locale)}
                  <span className="ml-2 text-muted-foreground">
                    ({Math.round((item.value / total) * 100)}%)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
