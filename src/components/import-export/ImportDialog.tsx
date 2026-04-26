import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, FileUp, AlertCircle, CheckCircle2, SkipForward } from 'lucide-react'
import { useHousehold } from '@/stores/household-context'
import { useAuth } from '@/stores/auth-context'
import { supabase } from '@/lib/supabase'
import { parseCSV, mapCSVToTransactions, guessCategoryId, type ColumnMapping, type ImportPreview, type CategoryHint } from '@/lib/csv-import'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormDialog } from '@/components/ui/form-dialog'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

type Step = 'upload' | 'map' | 'preview' | 'done'

export function ImportDialog({ open, onOpenChange, onImported }: Props) {
  const { t } = useTranslation()
  const { household, categories } = useHousehold()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({ date: '', amount: '', description: '' })
  const [preview, setPreview] = useState<ImportPreview[]>([])
  const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set())
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setStep('upload')
    setHeaders([])
    setRawRows([])
    setMapping({ date: '', amount: '', description: '' })
    setPreview([])
    setDuplicateIndices(new Set())
    setSkipDuplicates(true)
    setImporting(false)
    setImportedCount(0)
    setSkippedCount(0)
    setError(null)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const { headers: h, rows } = parseCSV(text)

      if (h.length === 0 || rows.length === 0) {
        setError(t('import.invalidFile'))
        return
      }

      setHeaders(h)
      setRawRows(rows)

      // Auto-detect common column names
      const autoMap: ColumnMapping = { date: '', amount: '', description: '' }
      for (const header of h) {
        const lower = header.toLowerCase()
        if (/date|תאריך/.test(lower) && !autoMap.date) autoMap.date = header
        if (/amount|sum|סכום/.test(lower) && !autoMap.amount) autoMap.amount = header
        if (/desc|memo|note|פירוט|תיאור/.test(lower) && !autoMap.description) autoMap.description = header
        if (/categ|קטגוריה/.test(lower) && !autoMap.category) autoMap.category = header
      }
      setMapping(autoMap)
      setStep('map')
    }
    reader.readAsText(file)
  }

  async function handleMapComplete() {
    if (!mapping.date || !mapping.amount) {
      setError(t('import.requiredFields'))
      return
    }

    const mapped = mapCSVToTransactions(rawRows, mapping)
    if (mapped.length === 0) {
      setError(t('import.noValidRows'))
      return
    }

    // Apply category guessing to each row
    const catHints = categories as unknown as CategoryHint[]
    const withCategories = mapped.map(row => {
      const guess = guessCategoryId(row.category, row.description, row.isIncome, catHints)
      return { ...row, mappedCategoryId: guess?.id, mappedCategoryName: guess?.name }
    })
    setPreview(withCategories)

    // Duplicate detection: fetch existing transactions in the date range
    if (household) {
      const dates = withCategories.map(r => r.date).sort()
      const minDate = dates[0]
      const maxDate = dates[dates.length - 1]

      const { data: existing } = await supabase
        .from('transactions')
        .select('transaction_date, amount, description')
        .eq('household_id', household.id)
        .gte('transaction_date', minDate)
        .lte('transaction_date', maxDate)

      if (existing && existing.length > 0) {
        const dupSet = new Set<number>()
        withCategories.forEach((row, i) => {
          const isDup = existing.some(ex =>
            ex.transaction_date === row.date &&
            Math.abs(ex.amount - row.amount) < 0.01 &&
            (ex.description ?? '').trim().toLowerCase() === (row.description ?? '').trim().toLowerCase()
          )
          if (isDup) dupSet.add(i)
        })

        // Intra-batch time disambiguation: two rows with same date+amount+description
        // but different non-null times are distinct transactions — remove dup flags
        const keyFn = (row: ImportPreview) =>
          `${row.date}|${row.amount}|${(row.description ?? '').trim().toLowerCase()}`
        const groupedByKey = new Map<string, number[]>()
        withCategories.forEach((row, i) => {
          const k = keyFn(row)
          if (!groupedByKey.has(k)) groupedByKey.set(k, [])
          groupedByKey.get(k)!.push(i)
        })
        for (const [, indices] of groupedByKey) {
          if (indices.length > 1) {
            const times = indices.map(i => withCategories[i].time)
            const allHaveTimes = times.every(t => t !== null)
            const allDistinctTimes = new Set(times).size === times.length
            if (allHaveTimes && allDistinctTimes) indices.forEach(i => dupSet.delete(i))
          }
        }

        setDuplicateIndices(dupSet)
      } else {
        setDuplicateIndices(new Set())
      }
    }

    setStep('preview')
  }

  async function handleImport() {
    if (!household || !user) return

    setImporting(true)
    setError(null)

    try {
      const defaultExpenseCat = categories.find(c => c.type === 'expense' && c.name_key === 'other')
        ?? categories.find(c => c.type === 'expense')
      const defaultIncomeCat = categories.find(c => c.type === 'income')

      const rowsToImport = skipDuplicates
        ? preview.filter((_, i) => !duplicateIndices.has(i))
        : preview

      const txInserts = rowsToImport.map(row => ({
        household_id: household.id,
        category_id: row.mappedCategoryId
          ?? (row.isIncome
            ? (defaultIncomeCat?.id ?? '')
            : (defaultExpenseCat?.id ?? '')),
        entered_by: user.id,
        amount: row.amount,
        currency: household.default_currency,
        converted_amount: row.amount,
        exchange_rate: 1,
        description: row.description || null,
        transaction_date: row.date,
        is_manual: false,
        source: 'bank_import' as const,
      })).filter(tx => tx.category_id)

      // Insert in batches of 50
      let imported = 0
      for (let i = 0; i < txInserts.length; i += 50) {
        const batch = txInserts.slice(i, i + 50)
        const { error: insertError } = await supabase.from('transactions').insert(batch)
        if (insertError) throw insertError
        imported += batch.length
      }

      setImportedCount(imported)
      setSkippedCount(skipDuplicates ? duplicateIndices.size : 0)
      setStep('done')
      onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) reset()
        onOpenChange(isOpen)
      }}
      title={t('import.title')}
      className="max-w-2xl"
    >
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 py-12 px-6 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium">{t('import.dropOrClick')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('import.csvOnly')}</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
      )}

      {step === 'map' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('import.mapColumns', { count: rawRows.length })}
          </p>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t('import.dateColumn')} *</Label>
              <Select value={mapping.date} onValueChange={v => setMapping(p => ({ ...p, date: v }))}>
                <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {headers.map(h => (
                    <SelectItem key={h} value={h} className="cursor-pointer">{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('import.amountColumn')} *</Label>
              <Select value={mapping.amount} onValueChange={v => setMapping(p => ({ ...p, amount: v }))}>
                <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {headers.map(h => (
                    <SelectItem key={h} value={h} className="cursor-pointer">{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('import.descriptionColumn')}</Label>
              <Select value={mapping.description || '__none__'} onValueChange={v => setMapping(p => ({ ...p, description: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="cursor-pointer">—</SelectItem>
                  {headers.map(h => (
                    <SelectItem key={h} value={h} className="cursor-pointer">{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { reset() }} className="cursor-pointer">
              {t('common.back')}
            </Button>
            <Button onClick={handleMapComplete} className="cursor-pointer">
              {t('import.preview')}
            </Button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              {t('import.previewDesc', { count: preview.length })}
              {duplicateIndices.size > 0 && (
                <span className="ml-2 text-warning font-medium">
                  · {duplicateIndices.size} {t('import.duplicatesFound')}
                </span>
              )}
            </p>
            {duplicateIndices.size > 0 && (
              <button
                type="button"
                onClick={() => setSkipDuplicates(p => !p)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer',
                  skipDuplicates
                    ? 'bg-warning/10 border-warning/40 text-warning'
                    : 'bg-muted/40 border-border/50 text-muted-foreground'
                )}
              >
                <SkipForward className="h-3 w-3" />
                {skipDuplicates ? t('import.skippingDuplicates') : t('import.includingDuplicates')}
              </button>
            )}
          </div>

          <ScrollArea className="h-72 w-full rounded-lg border border-border/50">
            <div className="min-w-max divide-y divide-border/50">
              {preview.slice(0, 100).map((row, i) => {
                const isDup = duplicateIndices.has(i)
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-xs',
                      isDup && skipDuplicates && 'opacity-40 line-through'
                    )}
                  >
                    <span className="text-muted-foreground w-28 shrink-0">
                      {row.date}{row.time ? ` ${row.time}` : ''}
                    </span>
                    <Badge variant={row.isIncome ? 'default' : 'secondary'} className="text-xs px-1.5 py-0 shrink-0">
                      {row.isIncome ? '+' : '-'}
                    </Badge>
                    {isDup && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0 shrink-0 text-warning border-warning/40">
                        {t('import.duplicate')}
                      </Badge>
                    )}
                    <div className="flex flex-col min-w-0 flex-1 max-w-xs">
                      <span className="truncate">{row.description || '—'}</span>
                      {row.mappedCategoryName && (
                        <span className="text-[10px] text-muted-foreground/60 truncate">→ {row.mappedCategoryName}</span>
                      )}
                    </div>
                    <span className={cn(
                      'font-medium tabular-nums shrink-0',
                      row.isIncome ? 'text-success' : 'text-foreground'
                    )}>
                      {row.amount.toFixed(2)}
                    </span>
                  </div>
                )
              })}
              {preview.length > 100 && (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                  …and {preview.length - 100} more
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setStep('map')} className="cursor-pointer">
              {t('common.back')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || (skipDuplicates && duplicateIndices.size === preview.length)}
              className="cursor-pointer"
            >
              <FileUp className="h-4 w-4 mr-1.5" />
              {importing
                ? t('common.loading')
                : t('import.importBtn', { count: skipDuplicates ? preview.length - duplicateIndices.size : preview.length })}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 mb-4">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <p className="text-lg font-semibold">{t('import.success')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('import.importedCount', { count: importedCount })}
          </p>
          {skippedCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('import.skippedCount', { count: skippedCount })}
            </p>
          )}
          <Button onClick={() => { reset(); onOpenChange(false) }} className="mt-6 cursor-pointer">
            {t('common.close')}
          </Button>
        </div>
      )}
    </FormDialog>
  )
}
