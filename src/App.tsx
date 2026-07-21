import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { StoryProvider } from '@/contexts/StoryContext'
import { AppShell } from '@/components/AppShell'
import { VerifyEmail } from '@/components/auth/VerifyEmail'

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
          {/* Email verification route — no auth context needed */}
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Main app — all other routes go through AppShell */}
          <Route
            path="*"
            element={
              <AuthProvider>
                <StoryProvider>
                  <AppShell />
                </StoryProvider>
              </AuthProvider>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
