import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProfileProvider } from './contexts/ProfileContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicOnlyRoute } from './components/PublicOnlyRoute'
import { RequireProfile } from './components/RequireProfile'
import { SignupPage } from './pages/SignupPage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProfilePage } from './pages/ProfilePage'

export function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/signup"
              element={
                <PublicOnlyRoute>
                  <SignupPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RequireProfile>
                    <DashboardPage />
                  </RequireProfile>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ProfileProvider>
    </AuthProvider>
  )
}
