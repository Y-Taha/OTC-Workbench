import { useEffect, useState } from 'react'
import { supabaseClient } from '../lib/supabaseClient'
import { useTenant } from '../providers/TenantProvider'

type AccessState = {
  canManageUsers: boolean
  loading: boolean
}

export function useCanManageUsers(): AccessState {
  const tenant = useTenant()
  const [accessState, setAccessState] = useState<AccessState>({
    canManageUsers: false,
    loading: true,
  })

  useEffect(() => {
    let isMounted = true

    async function loadAccess() {
      setAccessState({ canManageUsers: false, loading: true })

      const { data: userData, error: userError } = await supabaseClient.auth.getUser()
      const user = userData.user

      if (userError || !user) {
        if (isMounted) setAccessState({ canManageUsers: false, loading: false })
        return
      }

      const { data: membership } = await supabaseClient
        .from('tenant_memberships')
        .select('role')
        .eq('tenant_id', tenant.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (isMounted) {
        setAccessState({ canManageUsers: membership?.role === 'admin', loading: false })
      }
    }

    void loadAccess()

    return () => {
      isMounted = false
    }
  }, [tenant.id])

  return accessState
}
