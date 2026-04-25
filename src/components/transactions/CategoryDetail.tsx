import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Trash2, Edit } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Category, Transaction } from '@/types/database'
import { cn } from '@/lib/utils'

interface Props {
  category: Category
  transactions: Transaction[]
  total: number
  currency: string
  locale?: string
  onEdit?: (tx: Transaction) => void
  onDelete?: (tx: Transaction) => void
}

export function CategoryDetail({ category, transactions, total, currency, locale = 'en-US', onEdit, onDelete }: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 transition-colors duration-200 hover:bg-muted/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{category.name}</span>
          {transactions.length > 0 && (
            <span className="text-xs text-muted-foreground">({transactions.length})</span>
          )}
        </div>
        <span className="text-sm font-semibold">
          {formatCurrency(total, currency, locale)}
        </span>
      </button>

      {expanded && transactions.length > 0 && (
        <div className="bg-muted/20 px-4 pb-3">
          {transactions.map(tx => (
            <div
              key={tx.id}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  {tx.description || t('transactions.noDescription')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(tx.transaction_date, locale)}
                  {tx.source === 'estimated' && (
                    <span className="ml-2 text-warning">({t('dashboard.estimated')})</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 ml-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn(
                      'text-sm font-medium',
                      category.type === 'income' ? 'text-success' : 'text-foreground'
                    )}>
                      {tx.currency !== currency && tx.converted_amount
                        ? formatCurrency(tx.converted_amount, currency, locale)
                        : formatCurrency(tx.amount, tx.currency, locale)
                      }
                    </span>
                  </TooltipTrigger>
                  {tx.currency !== currency && (
                    <TooltipContent>
                      <p>Original: {formatCurrency(tx.amount, tx.currency, locale)}</p>
                      <p>Rate: {tx.exchange_rate}</p>
                    </TooltipContent>
                  )}
                </Tooltip>

                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onEdit(tx) }}
                    aria-label={t('common.edit')}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onDelete(tx) }}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
