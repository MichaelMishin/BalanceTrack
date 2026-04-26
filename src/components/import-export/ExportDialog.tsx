import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import type { Transaction, Category } from '@/types/database'
import { exportToCSV, exportToPDF } from '@/lib/export'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactions: Transaction[]
  categories: Category[]
  periodLabel: string
  totals: { income: number; expenses: number; net: number }
  currency: string
  locale: string
}

export function ExportDialog({
  open,
  onOpenChange,
  transactions,
  categories,
  periodLabel,
  totals,
  currency,
  locale,
}: Props) {
  const { t } = useTranslation()
  const [exporting, setExporting] = useState(false)

  async function handleCSV() {
    setExporting(true)
    try {
      exportToCSV(transactions, categories, periodLabel)
    } finally {
      setExporting(false)
      onOpenChange(false)
    }
  }

  async function handlePDF() {
    setExporting(true)
    try {
      exportToPDF(transactions, categories, periodLabel, totals, currency, locale)
    } finally {
      setExporting(false)
      onOpenChange(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('export.title')}
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t('export.description', { period: periodLabel, count: transactions.length })}
        </p>

        <div className="grid gap-3">
          <button
            onClick={handleCSV}
            disabled={exporting}
            className="flex items-center gap-4 rounded-xl border border-border/50 p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <FileSpreadsheet className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{t('export.csv')}</p>
              <p className="text-xs text-muted-foreground">{t('export.csvDesc')}</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={handlePDF}
            disabled={exporting}
            className="flex items-center gap-4 rounded-xl border border-border/50 p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{t('export.pdf')}</p>
              <p className="text-xs text-muted-foreground">{t('export.pdfDesc')}</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            {t('common.close')}
          </Button>
        </div>
      </div>
    </FormDialog>
  )
}
