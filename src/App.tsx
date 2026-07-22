import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { StoryProvider } from '@/contexts/StoryContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { AutoSaveProvider } from '@/contexts/AutoSaveContext'
import { AppShell } from '@/components/AppShell'
import { VerifyEmail } from '@/components/auth/VerifyEmail'
import { LandingPage } from '@/components/landing/LandingPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Landing page — public, no auth context needed */}
          <Route path="/" element={<LandingPage />} />

          {/* Email verification route — no auth context needed */}
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Main app — /app/* routes go through AppShell */}
          <Route
            path="/app/*"
            element={
              <AuthProvider>
                <StoryProvider>
                  <ToastProvider>
                    <AutoSaveProvider>
                      <AppShell />
                    </AutoSaveProvider>
                  </ToastProvider>
                </StoryProvider>
              </AuthProvider>
            }
          />

          {/* Catch-all: redirect old root paths to /app */}
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
