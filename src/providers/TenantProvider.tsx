import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { loadTenant, tenantSlug, type Tenant } from '../lib/tenant'
import { ForbiddenPage } from '../pages/ErrorPages'

type TenantContextValue = {
  tenant: Tenant
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    loadTenant()
      .then((loadedTenant) => {
        if (isMounted) setTenant(loadedTenant)
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Could not load tenant')
      })

    return () => {
      isMounted = false
    }
  }, [])

  const value = useMemo(() => (tenant ? { tenant } : null), [tenant])

  if (error) {
    return (
      <ForbiddenPage
        fullPage
        title="Tenant access denied"
        message={`Your account is not authorized for the "${tenantSlug}" workspace.`}
        detail={error}
      />
    )
  }

  if (!value) return <div className="page-card">Loading tenant...</div>

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant() {
  const value = useContext(TenantContext)
  if (!value) throw new Error('useTenant must be used inside TenantProvider')
  return value.tenant
}
