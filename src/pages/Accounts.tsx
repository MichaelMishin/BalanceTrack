import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/stores/auth-context'
import { useHousehold } from '@/stores/household-context'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Landmark, CreditCard, PiggyBank, Wallet } from 'lucide-react'

const accountIcons = {
  checking: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  other: Wallet,
} as const

export function AccountsPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const { household, accounts, refreshAccounts } = useHousehold()

  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState<'checking' | 'savings' | 'credit_card' | 'other'>('checking')

  async function handleAddAccount() {
    if (!household || !profile || !accountName.trim()) return
    await supabase.from('financial_accounts').insert({
      household_id: household.id,
      owner_id: profile.id,
      name: accountName.trim(),
      type: accountType,
      currency: household.default_currency,
    })
    setAccountName('')
    refreshAccounts()
  }

  async function handleDeleteAccount(id: string) {
    if (!window.confirm(t('transactions.confirmDelete'))) return
    await supabase.from('financial_accounts').delete().eq('id', id)
    refreshAccounts()
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">{t('nav.accounts')}</h1>

      {/* Add Account */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-base font-semibold">{t('settings.addAccount')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder={t('settings.addAccount')}
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddAccount()}
              className="flex-1"
            />
            <Select value={accountType} onValueChange={(v) => setAccountType(v as typeof accountType)}>
              <SelectTrigger className="w-full sm:w-40 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking" className="cursor-pointer">Checking</SelectItem>
                <SelectItem value="savings" className="cursor-pointer">Savings</SelectItem>
                <SelectItem value="credit_card" className="cursor-pointer">Credit Card</SelectItem>
                <SelectItem value="other" className="cursor-pointer">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddAccount} disabled={!accountName.trim()} className="cursor-pointer">
              <Plus className="h-4 w-4 mr-1" />
              {t('common.add')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account List */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-base font-semibold">{t('settings.financialAccounts')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-3">
                <Landmark className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">No accounts yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {accounts.map(account => {
                const Icon = accountIcons[account.type as keyof typeof accountIcons] ?? Wallet
                return (
                  <div key={account.id} className="flex items-center gap-4 px-4 py-3 row-hover transition-colors">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{account.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0 capitalize">
                          {account.type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{account.currency}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer shrink-0"
                      onClick={() => handleDeleteAccount(account.id)}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          {t('settings.connectBank')}
        </CardContent>
      </Card>
    </div>
  )
}
