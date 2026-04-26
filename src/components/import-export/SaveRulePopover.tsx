import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookmarkPlus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useImportRules, type ImportRuleInput } from '@/hooks/use-import-rules'
import { cn } from '@/lib/utils'

interface Props {
  /** Pre-filled description used as default pattern */
  description: string
  /** Pre-selected category ID */
  categoryId: string | undefined
  /** Pre-selected direction */
  direction: 'income' | 'expense' | 'auto'
  /** Callback after rule is saved (or dismissed) */
  onSaved?: () => void
  className?: string
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function SaveRulePopover({ description, categoryId, direction, onSaved, className }: Props) {
  const { t } = useTranslation()
  const { createRule } = useImportRules()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [pattern, setPattern] = useState('')
  const [dir, setDir] = useState<ImportRuleInput['direction']>(direction)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [patternError, setPatternError] = useState(false)

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen) {
      // Pre-fill from props
      const clean = description.trim().slice(0, 40)
      setName(clean)
      setPattern(escapeRegex(clean))
      setDir(direction)
      setSaved(false)
      setPatternError(false)
    }
  }

  function validatePattern(p: string) {
    try {
      new RegExp(p, 'i')
      setPatternError(false)
      return true
    } catch {
      setPatternError(true)
      return false
    }
  }

  async function handleSave() {
    if (!validatePattern(pattern)) return
    if (!name.trim() || !pattern.trim()) return

    setSaving(true)
    await createRule({ name: name.trim(), pattern, categoryId: categoryId ?? null, direction: dir })
    setSaving(false)
    setSaved(true)
    setTimeout(() => {
      setOpen(false)
      onSaved?.()
    }, 900)
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={t('import.saveAsRule')}
          className={cn(
            'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
            'text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer',
            className
          )}
        >
          <BookmarkPlus className="h-3 w-3" />
          {t('import.saveAsRule')}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-3" align="start">
        {saved ? (
          <div className="flex items-center gap-2 text-sm text-success py-2">
            <Check className="h-4 w-4" />
            {t('import.ruleSaved')}
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{t('import.saveRuleHint')}</p>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('import.ruleName')}</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-8 text-xs"
                placeholder={t('import.ruleName')}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('import.rulePattern')}</Label>
              <Input
                value={pattern}
                onChange={e => { setPattern(e.target.value); validatePattern(e.target.value) }}
                className={cn('h-8 text-xs font-mono', patternError && 'border-destructive')}
                placeholder="e.g. amazon|amz"
              />
              {patternError && (
                <p className="text-[10px] text-destructive">{t('import.ruleInvalidPattern')}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('import.ruleDirection')}</Label>
              <Select value={dir} onValueChange={v => setDir(v as ImportRuleInput['direction'])}>
                <SelectTrigger className="h-8 text-xs cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" className="text-xs cursor-pointer">{t('import.ruleDirectionAuto')}</SelectItem>
                  <SelectItem value="income" className="text-xs cursor-pointer">{t('import.ruleDirectionIncome')}</SelectItem>
                  <SelectItem value="expense" className="text-xs cursor-pointer">{t('import.ruleDirectionExpense')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1 h-8 text-xs cursor-pointer"
                onClick={handleSave}
                disabled={saving || !name.trim() || !pattern.trim() || patternError}
              >
                {saving ? t('common.loading') : t('common.save')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs cursor-pointer"
                onClick={() => setOpen(false)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
