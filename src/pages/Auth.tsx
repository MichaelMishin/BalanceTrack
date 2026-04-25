import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/stores/auth-context'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Sparkles } from 'lucide-react'

export function AuthPage() {
  const { t } = useTranslation()
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, loading } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-400 text-primary-foreground shadow-lg shadow-primary/30 animate-scale-in">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="text-sm text-muted-foreground animate-fade-in">{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName)
      } else {
        await signInWithEmail(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-chart-2/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-chart-5/5 blur-[100px]" />
      </div>

      <Card className="relative w-full max-w-md border-border/50 glass-card animate-scale-in">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-400 text-primary-foreground shadow-xl shadow-primary/25">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{t('app.name')}</CardTitle>
          <CardDescription className="text-muted-foreground/80">{t('app.tagline')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2 animate-slide-down">
                <Label htmlFor="displayName" className="text-xs font-medium">{t('auth.displayName')}</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={isSignUp}
                  autoComplete="name"
                  className="h-10 rounded-xl border-border/50 bg-muted/30 focus:bg-muted/50 transition-colors"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10 rounded-xl border-border/50 bg-muted/30 focus:bg-muted/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className="h-10 rounded-xl border-border/50 bg-muted/30 focus:bg-muted/50 transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 animate-slide-down">
                <p className="text-sm text-destructive" role="alert">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full cursor-pointer h-10 rounded-xl font-semibold bg-gradient-to-r from-primary to-blue-400 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
              disabled={submitting}
            >
              {submitting ? t('common.loading') : isSignUp ? t('auth.signUp') : t('auth.signIn')}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <Separator className="flex-1 bg-border/50" />
            <span className="text-xs text-muted-foreground/60">{t('auth.orContinueWith')}</span>
            <Separator className="flex-1 bg-border/50" />
          </div>

          <Button
            variant="outline"
            className="w-full cursor-pointer h-10 rounded-xl border-border/50 hover:bg-muted/50 transition-colors"
            onClick={() => signInWithGoogle()}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t('auth.google')}
          </Button>

          <p className="mt-5 text-center text-sm text-muted-foreground/80">
            {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}{' '}
            <button
              type="button"
              className="font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
              }}
            >
              {isSignUp ? t('auth.signIn') : t('auth.signUp')}
            </button>
          </p>

          {!isSignUp && (
            <>
              <Separator className="my-4 bg-border/50" />
              <Button
                variant="outline"
                className="w-full cursor-pointer text-xs rounded-xl border-border/50 border-dashed hover:bg-muted/50 transition-colors"
                disabled={submitting}
                onClick={async () => {
                  setError(null)
                  setSubmitting(true)
                  try {
                    await signInWithEmail('test@balancetrack.app', 'Test1234!')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'An error occurred')
                  } finally {
                    setSubmitting(false)
                  }
                }}
              >
                Quick Login (Test Account)
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
