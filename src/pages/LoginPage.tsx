import { type FormEvent, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabaseClient } from '../lib/supabaseClient'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setIsAuthenticated(Boolean(data.session))
      setIsCheckingSession(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password })

    setIsSubmitting(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    navigate('/', { replace: true })
  }

  if (isCheckingSession) return <div className="auth-page">Checking session...</div>
  if (isAuthenticated) return <Navigate to="/" replace />

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div>
          <p className="eyebrow">Secure access</p>
          <h1>Sign in to OTC Workbench</h1>
        </div>

        <label className="field">
          <span>Email</span>
          <input type="email" value={email} autoComplete="email" required onChange={(event) => setEmail(event.target.value)} />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            required
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="button primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
