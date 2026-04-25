import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/stores/auth-context'
import { useHousehold } from '@/stores/household-context'
import { COMMON_CURRENCIES } from '@/lib/currency'
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TimeFrame } from '@/types/database'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { profile, updateProfile } = useAuth()
  const { household, updateHouseholdCurrency } = useHousehold()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [currency, setCurrency] = useState(profile?.preferred_currency ?? 'ILS')
  const [timeframe, setTimeframe] = useState<TimeFrame>(profile?.preferred_timeframe ?? 'monthly')
  const [savingsTarget, setSavingsTarget] = useState(profile?.savings_target_pct?.toString() ?? '20')
  const [locale, setLocale] = useState(profile?.locale ?? 'en')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Auto-clear saved indicator
  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [saved])

  async function handleSaveProfile() {
    setSaving(true)
    try {
      await updateProfile({
        display_name: displayName,
        preferred_currency: currency,
        preferred_timeframe: timeframe,
        savings_target_pct: parseFloat(savingsTarget),
        locale,
      })
      // Sync household currency
      if (household && currency !== household.default_currency) {
        await updateHouseholdCurrency(currency)
      }
      // Sync i18n
      i18n.changeLanguage(locale)
      document.documentElement.dir = locale === 'he' ? 'rtl' : 'ltr'
      document.documentElement.lang = locale
      setSaved(true)
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h1>

      {/* Profile */}
      <GlassCard className="overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-base font-semibold">{t('settings.profile')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('auth.displayName')}</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('settings.currency')}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code} className="cursor-pointer">
                      {c.symbol} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('settings.timeframe')}</Label>
              <Select value={timeframe} onValueChange={(v) => setTimeframe(v as TimeFrame)}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly" className="cursor-pointer">{t('settings.weekly')}</SelectItem>
                  <SelectItem value="biweekly" className="cursor-pointer">{t('settings.biweekly')}</SelectItem>
                  <SelectItem value="monthly" className="cursor-pointer">{t('settings.monthly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('settings.savingsTarget')}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={savingsTarget}
                onChange={e => setSavingsTarget(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('settings.language')}</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en" className="cursor-pointer">English</SelectItem>
                  <SelectItem value="he" className="cursor-pointer">עברית</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSaveProfile} disabled={saving} className="cursor-pointer">
              {saving ? t('common.loading') : t('common.save')}
            </Button>
            {saved && (
              <span className="text-sm text-success animate-fade-in">
                {t('settings.saved', 'Saved!')}
              </span>
            )}
          </div>
        </CardContent>
      </GlassCard>
    </div>
  )
}
