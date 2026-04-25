import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/stores/auth-context'
import { HouseholdProvider } from '@/stores/household-context'
import { MainLayout } from '@/components/layout/MainLayout'
import { AuthPage } from '@/pages/Auth'
import { Dashboard } from '@/pages/Dashboard'
import { PersonalView } from '@/pages/PersonalView'
import { TransactionsPage } from '@/pages/Transactions'
import { SettingsPage } from '@/pages/Settings'
import { CategoriesPage } from '@/pages/Categories'
import { AccountsPage } from '@/pages/Accounts'

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-400 animate-scale-in shadow-lg shadow-primary/20" />
          <div className="h-1 w-16 rounded-full overflow-hidden bg-muted">
            <div className="h-full w-1/2 rounded-full bg-primary animate-shimmer" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return (
    <HouseholdProvider>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="personal" element={<PersonalView />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="accounts" element={<AccountsPage />} />
        </Route>
      </Routes>
    </HouseholdProvider>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}

export default App
