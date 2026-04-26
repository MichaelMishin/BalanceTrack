import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useHousehold } from '@/stores/household-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormDialog } from '@/components/ui/form-dialog'
import { cn } from '@/lib/utils'
import type { ImportMappingRule } from '@/lib/csv-import'
import type { ImportRuleInput } from '@/hooks/use-import-rules'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: ImportRuleInput) => Promise<void>
  editRule?: ImportMappingRule | null
}

export function ImportRuleForm({ open, onOpenChange, onSave, editRule }: Props) {
  const { t } = useTranslation()
  const { categories } = useHousehold()

  const [name, setName] = useState('')
  const [pattern, setPattern] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [direction, setDirection] = useState<ImportRuleInput['direction']>('auto')
  const [isActive, setIsActive] = useState(true)
  const [testText, setTestText] = useState('')
  const [saving, setSaving] = useState(false)
  const [patternError, setPatternError] = useState('')

  // Reset when opening or switching edit target
  useEffect(() => {
    if (open) {
      setName(editRule?.name ?? '')
      setPattern(editRule?.pattern ?? '')
      setCategoryId(editRule?.categoryId ?? null)
      setDirection(editRule?.direction ?? 'auto')
      setIsActive(editRule?.isActive ?? true)
      setTestText('')
      setPatternError('')
      setSaving(false)
    }
  }, [open, editRule])

  function validatePattern(p: string): boolean {
    try {
      new RegExp(p, 'i')
      setPatternError('')
      return true
    } catch (e) {
      setPatternError(e instanceof Error ? e.message : t('import.ruleInvalidPattern'))
      return false
    }
  }

  const isPatternValid = !patternError && pattern.trim().length > 0

  let testResult: 'match' | 'nomatch' | null = null
  if (testText.trim() && isPatternValid) {
    try {
      testResult = new RegExp(pattern, 'i').test(testText) ? 'match' : 'nomatch'
    } catch {
      testResult = null
    }
  }

  // Filter categories based on selected direction
  const filteredCategories = direction === 'auto'
    ? categories
    : categories.filter(c => c.type === direction)

  async function handleSubmit() {
    if (!validatePattern(pattern)) return
    if (!name.trim() || !pattern.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), pattern, categoryId, direction, isActive })
    setSaving(false)
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editRule ? t('import.editRule') : t('import.addRule')}
      className="max-w-lg"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !isPatternValid}
            className="cursor-pointer"
          >
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <Label>{t('import.ruleName')}</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('import.ruleName')}
            autoFocus
          />
        </div>

        {/* Pattern */}
        <div className="space-y-1.5">
          <Label>{t('import.rulePattern')}</Label>
          <Input
            value={pattern}
            onChange={e => { setPattern(e.target.value); validatePattern(e.target.value) }}
            placeholder="e.g. amazon|amz|whole foods"
            className={cn('font-mono', patternError && 'border-destructive')}
          />
          {patternError && (
            <p className="text-xs text-destructive">{patternError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Case-insensitive regex matched against description + category
          </p>
        </div>

        {/* Test Pattern */}
        <div className="space-y-1.5">
          <Label>{t('import.ruleTestPattern')}</Label>
          <div className="flex gap-2">
            <Input
              value={testText}
              onChange={e => setTestText(e.target.value)}
              placeholder={t('import.ruleTestPlaceholder')}
              className="flex-1"
            />
            {testResult && (
              <div className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium shrink-0',
                testResult === 'match'
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              )}>
                {testResult === 'match'
                  ? <><CheckCircle2 className="h-3.5 w-3.5" /> {t('import.ruleTestMatch')}</>
                  : <><XCircle className="h-3.5 w-3.5" /> {t('import.ruleTestNoMatch')}</>
                }
              </div>
            )}
          </div>
        </div>

        {/* Direction */}
        <div className="space-y-1.5">
          <Label>{t('import.ruleDirection')}</Label>
          <Select value={direction} onValueChange={v => { setDirection(v as ImportRuleInput['direction']); setCategoryId(null) }}>
            <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto" className="cursor-pointer">{t('import.ruleDirectionAuto')}</SelectItem>
              <SelectItem value="income" className="cursor-pointer">{t('import.ruleDirectionIncome')}</SelectItem>
              <SelectItem value="expense" className="cursor-pointer">{t('import.ruleDirectionExpense')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label>{t('transactions.category')}</Label>
          <Select value={categoryId ?? '__none__'} onValueChange={v => setCategoryId(v === '__none__' ? null : v)}>
            <SelectTrigger className="cursor-pointer"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="cursor-pointer">—</SelectItem>
              {filteredCategories.map(cat => (
                <SelectItem key={cat.id} value={cat.id} className="cursor-pointer">
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive(p => !p)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
              'transition-colors duration-200 ease-in-out focus-visible:outline-none',
              isActive ? 'bg-primary' : 'bg-input'
            )}
          >
            <span className={cn(
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ease-in-out',
              isActive ? 'translate-x-4' : 'translate-x-0'
            )} />
          </button>
          <Label className="cursor-pointer" onClick={() => setIsActive(p => !p)}>
            {t('import.ruleActive')}
          </Label>
        </div>
      </div>
    </FormDialog>
  )
}
