import { type FormEvent, useEffect, useState } from 'react'
import { supabaseClient } from '../lib/supabaseClient'
import { loadSignedInUserTenantPath } from '../lib/tenant'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    supabaseClient.auth
      .getSession()
      .then(async ({ data }) => {
        if (!data.session) return null
        return loadSignedInUserTenantPath()
      })
      .then((tenantPath) => {
        if (!isMounted) return
        if (tenantPath) window.location.replace(tenantPath)
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Could not load your tenant workspace.')
      })
      .finally(() => {
        if (isMounted) setIsCheckingSession(false)
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

    if (signInError) {
      setIsSubmitting(false)
      setError(signInError.message)
      return
    }

    try {
      const tenantPath = await loadSignedInUserTenantPath()
      window.location.replace(tenantPath)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load your tenant workspace.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingSession) return <div className="auth-page">Checking session...</div>

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
