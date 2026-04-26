import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, FileUp, AlertCircle, CheckCircle2, SkipForward, ArrowLeftRight } from 'lucide-react'
import { useHousehold } from '@/stores/household-context'
import { useAuth } from '@/stores/auth-context'
import { supabase } from '@/lib/supabase'
import { parseCSV, mapCSVToTransactions, guessCategoryId, applyUserRules, type ColumnMapping, type ImportPreview, type CategoryHint } from '@/lib/csv-import'
import { useImportRules } from '@/hooks/use-import-rules'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormDialog } from '@/components/ui/form-dialog'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { SaveRulePopover } from '@/components/import-export/SaveRulePopover'
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
  const { rules } = useImportRules()
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

  function updatePreviewRow(index: number, patch: Partial<ImportPreview>) {
    setPreview(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row))
  }

  function flipAll() {
    const catHints = categories as unknown as CategoryHint[]
    setPreview(prev => prev.map(row => {
      // Don't flip direction-locked rows
      if (row.directionLocked) return row
      const newIsIncome = !row.isIncome
      // Re-guess category unless it's locked
      if (!row.categoryLocked) {
        const guess = guessCategoryId(row.category, row.description, newIsIncome, catHints)
        return { ...row, isIncome: newIsIncome, mappedCategoryId: guess?.id, mappedCategoryName: guess?.name }
      }
      return { ...row, isIncome: newIsIncome }
    }))
  }

  function flipRow(index: number) {
    const catHints = categories as unknown as CategoryHint[]
    setPreview(prev => prev.map((row, i) => {
      if (i !== index) return row
      const newIsIncome = !row.isIncome
      if (!row.categoryLocked) {
        const guess = guessCategoryId(row.category, row.description, newIsIncome, catHints)
        return { ...row, isIncome: newIsIncome, directionLocked: true, mappedCategoryId: guess?.id, mappedCategoryName: guess?.name }
      }
      return { ...row, isIncome: newIsIncome, directionLocked: true }
    }))
  }

  function setRowCategory(index: number, categoryId: string) {
    const cat = categories.find(c => c.id === categoryId)
    updatePreviewRow(index, {
      mappedCategoryId: categoryId,
      mappedCategoryName: cat?.name,
      categoryLocked: true,
    })
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
      // User-defined rules take priority over heuristics
      const ruleOverrides = applyUserRules(row, rules, catHints)
      const effectiveIsIncome = ruleOverrides.isIncome !== undefined ? ruleOverrides.isIncome : row.isIncome
      const guess = (!ruleOverrides.mappedCategoryId)
        ? guessCategoryId(row.category, row.description, effectiveIsIncome, catHints)
        : null
      return {
        ...row,
        isIncome: effectiveIsIncome,
        mappedCategoryId: ruleOverrides.mappedCategoryId ?? guess?.id,
        mappedCategoryName: ruleOverrides.mappedCategoryName ?? guess?.name,
      }
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
      className="max-w-2xl sm:max-w-3xl"
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

            <div className="space-y-2">
              <Label>{t('import.categoryColumn')}</Label>
              <Select value={mapping.category || '__none__'} onValueChange={v => setMapping(p => ({ ...p, category: v === '__none__' ? '' : v }))}>
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
            <div className="flex items-center gap-2 flex-wrap">
              {/* Flip All button */}
              <button
                type="button"
                onClick={flipAll}
                title={t('import.flipAllTitle')}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer bg-muted/40 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/70"
              >
                <ArrowLeftRight className="h-3 w-3" />
                {t('import.flipAll')}
              </button>
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
          </div>

          <ScrollArea className="h-80 w-full rounded-lg border border-border/50">
            <div className="min-w-max divide-y divide-border/50">
              {preview.slice(0, 100).map((row, i) => {
                const isDup = duplicateIndices.has(i)
                const rowCategories = categories.filter(c => c.type === (row.isIncome ? 'income' : 'expense'))
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-2 px-3 py-2 text-xs',
                      isDup && skipDuplicates && 'opacity-40 line-through'
                    )}
                  >
                    {/* Date */}
                    <span className="text-muted-foreground w-28 shrink-0 pt-0.5">
                      {row.date}{row.time ? ` ${row.time}` : ''}
                    </span>

                    {/* Direction toggle button */}
                    <button
                      type="button"
                      onClick={() => flipRow(i)}
                      title={row.isIncome ? t('transactions.income') : t('transactions.expense')}
                      className={cn(
                        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer border',
                        row.isIncome
                          ? 'bg-success/10 border-success/40 text-success hover:bg-success/20'
                          : 'bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20'
                      )}
                    >
                      {row.isIncome ? '+' : '−'}
                    </button>

                    {isDup && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 text-warning border-warning/40">
                        {t('import.duplicate')}
                      </Badge>
                    )}

                    {/* Description + category selector */}
                    <div className="flex flex-col min-w-0 flex-1 max-w-xs gap-1">
                      <span className="truncate">{row.description || '—'}</span>
                      {/* Per-row category select */}
                      <Select
                        value={row.mappedCategoryId ?? '__none__'}
                        onValueChange={v => setRowCategory(i, v === '__none__' ? '' : v)}
                      >
                        <SelectTrigger className="h-6 text-[10px] px-2 py-0 border-border/40 bg-muted/30 cursor-pointer max-w-[180px]">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs cursor-pointer">—</SelectItem>
                          {rowCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id} className="text-xs cursor-pointer">
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount */}
                    <span className={cn(
                      'font-medium tabular-nums shrink-0 pt-0.5',
                      row.isIncome ? 'text-success' : 'text-foreground'
                    )}>
                      {row.amount.toFixed(2)}
                    </span>

                    {/* Save as Rule */}
                    <SaveRulePopover
                      description={row.description}
                      categoryId={row.mappedCategoryId}
                      direction={row.directionLocked
                        ? (row.isIncome ? 'income' : 'expense')
                        : 'auto'}
                      className="shrink-0 pt-0.5"
                    />
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
