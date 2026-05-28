import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { forceRefreshSession, getAccessToken, supabase } from '@/lib/supabase'

type SessionContextValue = {
  accessToken: string | null
  refreshSession: () => Promise<string | null>
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const token = await getAccessToken().catch(() => null)
      setAccessToken(token)
    })()

    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null)
    })

    return () => {
      subscription.data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<SessionContextValue>(
    () => ({
      accessToken,
      refreshSession: forceRefreshSession,
    }),
    [accessToken]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSessionContext(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider')
  }
  return context
}
