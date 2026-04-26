import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, Copy, Check, Users, Crown, User, Trash2 } from 'lucide-react'
import { useHousehold } from '@/stores/household-context'
import { useAuth } from '@/stores/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { GlassCard, CardContent, CardHeader, CardTitle } from '@/components/ui/glass-card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface MemberWithProfile {
  profile_id: string
  role: string
  display_name: string | null
  email: string
}

export function HouseholdSection() {
  const { t } = useTranslation()
  const { household, members } = useHousehold()
  const { user } = useAuth()

  const [memberProfiles, setMemberProfiles] = useState<MemberWithProfile[]>([])
  const [inviteCode, setInviteCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [removeId, setRemoveId] = useState<string | null>(null)

  const isOwner = household?.owner_id === user?.id

  // Generate invite code from household ID
  useEffect(() => {
    if (household) {
      // Use first 8 chars of household ID as invite code
      setInviteCode(household.id.substring(0, 8).toUpperCase())
    }
  }, [household])

  // Fetch member profiles
  const fetchMemberProfiles = useCallback(async () => {
    if (!household || members.length === 0) return

    const profileIds = members.map(m => m.profile_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', profileIds)

    const enriched = members.map(m => {
      const profile = profiles?.find(p => p.id === m.profile_id)
      return {
        profile_id: m.profile_id,
        role: m.role,
        display_name: profile?.display_name ?? null,
        email: '', // Can't access other users' emails from client
      }
    })

    setMemberProfiles(enriched)
  }, [household, members])

  useEffect(() => {
    fetchMemberProfiles()
  }, [fetchMemberProfiles])

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  async function handleJoinHousehold() {
    if (!joinCode.trim() || !user) return

    setJoining(true)
    setError(null)
    setSuccess(null)

    try {
      // Find household by code (first 8 chars of ID)
      const { data: households } = await supabase
        .from('households')
        .select('id, name')
        .ilike('id', `${joinCode.toLowerCase()}%`)
        .limit(1)

      if (!households || households.length === 0) {
        setError(t('household.invalidCode'))
        setJoining(false)
        return
      }

      const targetHousehold = households[0]

      // Check if already a member
      const { data: existing } = await supabase
        .from('household_members')
        .select('profile_id')
        .eq('household_id', targetHousehold.id)
        .eq('profile_id', user.id)
        .single()

      if (existing) {
        setError(t('household.alreadyMember'))
        setJoining(false)
        return
      }

      // Join the household
      const { error: joinError } = await supabase
        .from('household_members')
        .insert({
          household_id: targetHousehold.id,
          profile_id: user.id,
          role: 'member',
        })

      if (joinError) throw joinError

      setSuccess(t('household.joined', { name: targetHousehold.name }))
      setJoinCode('')

      // Refresh the page to reload household context
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setJoining(false)
    }
  }

  async function handleRemoveMember(profileId: string) {
    if (!household) return

    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('household_id', household.id)
      .eq('profile_id', profileId)

    if (!error) {
      fetchMemberProfiles()
    }
  }

  return (
    <div className="space-y-6">
      {/* Members */}
      <GlassCard className="overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">{t('household.members')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {memberProfiles.map(member => (
              <div key={member.profile_id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  {member.role === 'owner' ? (
                    <Crown className="h-3.5 w-3.5 text-warning" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.display_name || t('household.unnamed')}
                    {member.profile_id === user?.id && (
                      <span className="text-xs text-muted-foreground ml-1">({t('household.you')})</span>
                    )}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs capitalize">
                  {member.role}
                </Badge>
                {isOwner && member.profile_id !== user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
                    onClick={() => setRemoveId(member.profile_id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </GlassCard>

      {/* Invite Section - Owner only */}
      {isOwner && (
        <GlassCard className="overflow-hidden">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">{t('household.invite')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('household.inviteCode')}</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteCode}
                  readOnly
                  className="font-mono tracking-wider"
                />
                <Button
                  variant="outline"
                  onClick={handleCopyCode}
                  className="cursor-pointer shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('household.shareCode')}
              </p>
            </div>
          </CardContent>
        </GlassCard>
      )}

      {/* Join Section - for users without household or wanting to join another */}
      <GlassCard className="overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-base font-semibold">{t('household.joinTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('household.enterCode')}</Label>
            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                className="font-mono tracking-wider"
                maxLength={8}
              />
              <Button
                onClick={handleJoinHousehold}
                disabled={joining || !joinCode.trim()}
                className="cursor-pointer shrink-0"
              >
                {joining ? t('common.loading') : t('household.join')}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}
          {success && (
            <p className="text-sm text-success animate-fade-in">{success}</p>
          )}
        </CardContent>
      </GlassCard>

      <ConfirmDialog
        open={!!removeId}
        onOpenChange={(open) => { if (!open) setRemoveId(null) }}
        title={t('household.removeMember')}
        description={t('household.removeConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onConfirm={async () => {
          if (removeId) {
            await handleRemoveMember(removeId)
            setRemoveId(null)
          }
        }}
      />
    </div>
  )
}
