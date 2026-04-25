import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/stores/auth-context'
import { HouseholdProvider } from '@/stores/household-context'
import { MainLayout } from '@/components/layout/MainLayout'
import { AuthPage } from '@/pages/Auth'
import { Dashboard } from '@/pages/Dashboard'
import { PersonalView } from '@/pages/PersonalView'
import { SettingsPage } from '@/pages/Settings'
import { CategoriesPage } from '@/pages/Categories'

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
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
          <Route path="settings" element={<SettingsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="accounts" element={<SettingsPage />} />
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
