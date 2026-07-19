import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { StoryProvider } from '@/contexts/StoryContext'
import { AppShell } from '@/components/AppShell'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StoryProvider>
          <AppShell />
        </StoryProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
