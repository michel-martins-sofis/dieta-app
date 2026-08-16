import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { ProfileProvider } from './contexts/ProfileContext'
import { FoodEntriesProvider } from './contexts/FoodEntriesContext'
import { MealPlansProvider } from './contexts/MealPlansContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { WeightLogsProvider } from './contexts/WeightLogsContext'
import { WaterLogsProvider } from './contexts/WaterLogsContext'
import { WorkoutsProvider } from './contexts/WorkoutsContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicOnlyRoute } from './components/PublicOnlyRoute'
import { RequireProfile } from './components/RequireProfile'
import { AppShell } from './components/AppShell'
import { SignupPage } from './pages/SignupPage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProfilePage } from './pages/ProfilePage'
import { AddFoodPage } from './pages/AddFoodPage'
import { FoodLogPage } from './pages/FoodLogPage'
import { HistoryPage } from './pages/HistoryPage'
import { ExportPage } from './pages/ExportPage'
import { WorkoutsPage } from './pages/WorkoutsPage'

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProfileProvider>
          <FoodEntriesProvider>
            <MealPlansProvider>
              <FavoritesProvider>
                <WeightLogsProvider>
                  <WaterLogsProvider>
                    <WorkoutsProvider>
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
                              <AppShell>
                                <ProfilePage />
                              </AppShell>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/add-food"
                          element={
                            <ProtectedRoute>
                              <AppShell>
                                <AddFoodPage />
                              </AppShell>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute>
                              <RequireProfile>
                                <AppShell>
                                  <DashboardPage />
                                </AppShell>
                              </RequireProfile>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/diario"
                          element={
                            <ProtectedRoute>
                              <RequireProfile>
                                <AppShell>
                                  <FoodLogPage />
                                </AppShell>
                              </RequireProfile>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/historico"
                          element={
                            <ProtectedRoute>
                              <RequireProfile>
                                <AppShell>
                                  <HistoryPage />
                                </AppShell>
                              </RequireProfile>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/exportar"
                          element={
                            <ProtectedRoute>
                              <RequireProfile>
                                <AppShell>
                                  <ExportPage />
                                </AppShell>
                              </RequireProfile>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/treinos"
                          element={
                            <ProtectedRoute>
                              <RequireProfile>
                                <AppShell>
                                  <WorkoutsPage />
                                </AppShell>
                              </RequireProfile>
                            </ProtectedRoute>
                          }
                        />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </BrowserRouter>
                    </WorkoutsProvider>
                  </WaterLogsProvider>
                </WeightLogsProvider>
              </FavoritesProvider>
            </MealPlansProvider>
          </FoodEntriesProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
