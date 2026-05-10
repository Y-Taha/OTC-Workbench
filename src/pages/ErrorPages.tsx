import { AlertTriangle, Home, LockKeyhole } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

type ErrorPageProps = {
  title?: string
  message?: string
  detail?: string
  fullPage?: boolean
  homeTo?: string
  homeLabel?: string
}

export function ForbiddenPage({
  title = 'Access denied',
  message = 'You do not have permission to access this workspace.',
  detail,
  fullPage = false,
  homeTo,
  homeLabel,
}: ErrorPageProps) {
  return (
    <ErrorShell fullPage={fullPage}>
      <div className="error-illustration forbidden">
        <LockKeyhole size={34} />
      </div>
      <p className="eyebrow">403 Unauthorized</p>
      <h1>{title}</h1>
      <p className="muted">{message}</p>
      {detail && <p className="error-detail">{detail}</p>}
      <ErrorActions homeTo={homeTo} homeLabel={homeLabel} />
    </ErrorShell>
  )
}

export function NotFoundPage({
  title = 'Page not found',
  message = 'The page you are looking for does not exist or has moved.',
  detail,
  fullPage = false,
}: ErrorPageProps) {
  return (
    <ErrorShell fullPage={fullPage}>
      <div className="error-illustration not-found">
        <AlertTriangle size={34} />
      </div>
      <p className="eyebrow">404 Not Found</p>
      <h1>{title}</h1>
      <p className="muted">{message}</p>
      {detail && <p className="error-detail">{detail}</p>}
      <ErrorActions />
    </ErrorShell>
  )
}

function ErrorShell({ children, fullPage }: { children: React.ReactNode; fullPage: boolean }) {
  return (
    <main className={fullPage ? 'error-page full-page' : 'error-page'}>
      <section className="error-card">{children}</section>
    </main>
  )
}

function ErrorActions({ homeTo = '/', homeLabel = 'Go home' }: { homeTo?: string; homeLabel?: string }) {
  const navigate = useNavigate()

  return (
    <div className="error-actions">
      <Link className="button primary" to={homeTo}>
        <Home size={16} />
        {homeLabel}
      </Link>
      <button className="button secondary" type="button" onClick={() => navigate(-1)}>
        Go back
      </button>
    </div>
  )
}
