import { type ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabaseClient } from '../lib/supabaseClient'

type AuthState = 'checking' | 'authenticated' | 'anonymous'

export function AuthGate({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('checking')

  useEffect(() => {
    let isMounted = true

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setAuthState(data.session ? 'authenticated' : 'anonymous')
    })

    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setAuthState(session ? 'authenticated' : 'anonymous')
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  if (authState === 'checking') return <div className="page-card">Checking session...</div>
  if (authState === 'anonymous') return <Navigate to="/login" replace />

  return children
}
