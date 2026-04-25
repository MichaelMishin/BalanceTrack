import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/stores/auth-context'
import { useHousehold } from '@/stores/household-context'
import { supabase } from '@/lib/supabase'
import { COMMON_CURRENCIES } from '@/lib/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { TimeFrame } from '@/types/database'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { profile, updateProfile } = useAuth()
  const { household, accounts, refreshAccounts } = useHousehold()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [currency, setCurrency] = useState(profile?.preferred_currency ?? 'ILS')
  const [timeframe, setTimeframe] = useState<TimeFrame>(profile?.preferred_timeframe ?? 'monthly')
  const [savingsTarget, setSavingsTarget] = useState(profile?.savings_target_pct?.toString() ?? '20')
  const [locale, setLocale] = useState(profile?.locale ?? 'en')
  const [saving, setSaving] = useState(false)

  // Account form
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState<'checking' | 'savings' | 'credit_card' | 'other'>('checking')

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
      // Sync i18n
      i18n.changeLanguage(locale)
      document.documentElement.dir = locale === 'he' ? 'rtl' : 'ltr'
      document.documentElement.lang = locale
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  async function handleAddAccount() {
    if (!household || !profile) return
    await supabase.from('financial_accounts').insert({
      household_id: household.id,
      owner_id: profile.id,
      name: accountName,
      type: accountType,
      currency,
    })
    setAccountName('')
    refreshAccounts()
  }

  async function handleDeleteAccount(id: string) {
    await supabase.from('financial_accounts').delete().eq('id', id)
    refreshAccounts()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profile')}</CardTitle>
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

          <Button onClick={handleSaveProfile} disabled={saving} className="cursor-pointer">
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Financial Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.financialAccounts')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.map(account => (
            <div key={account.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">{account.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{account.type} • {account.currency}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive cursor-pointer"
                onClick={() => handleDeleteAccount(account.id)}
              >
                {t('common.delete')}
              </Button>
            </div>
          ))}

          <Separator />

          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder={t('settings.addAccount')}
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              className="col-span-1"
            />
            <Select value={accountType} onValueChange={(v) => setAccountType(v as typeof accountType)}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking" className="cursor-pointer">Checking</SelectItem>
                <SelectItem value="savings" className="cursor-pointer">Savings</SelectItem>
                <SelectItem value="credit_card" className="cursor-pointer">Credit Card</SelectItem>
                <SelectItem value="other" className="cursor-pointer">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddAccount} disabled={!accountName} className="cursor-pointer">
              {t('common.add')}
            </Button>
          </div>

          <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            {t('settings.connectBank')}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
