import type { AuthProvider } from '@refinedev/core'
import { supabaseClient } from '../lib/supabaseClient'

type Credentials = {
  email: string
  password: string
}

export const authProvider: AuthProvider = {
  login: async ({ email, password }: Credentials) => {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password })

    if (error) {
      return {
        success: false,
        error,
      }
    }

    return {
      success: true,
      redirectTo: '/',
    }
  },
  register: async ({ email, password }: Credentials) => {
    const { error } = await supabaseClient.auth.signUp({ email, password })

    if (error) {
      return {
        success: false,
        error,
      }
    }

    return {
      success: true,
      redirectTo: '/',
    }
  },
  logout: async () => {
    await supabaseClient.auth.signOut()

    return {
      success: true,
      redirectTo: '/login',
    }
  },
  check: async () => {
    const { data } = await supabaseClient.auth.getSession()

    if (data.session) {
      return { authenticated: true }
    }

    return {
      authenticated: false,
      redirectTo: '/login',
      logout: true,
    }
  },
  getIdentity: async () => {
    const { data } = await supabaseClient.auth.getUser()

    if (!data.user) return null

    return {
      id: data.user.id,
      name: data.user.email,
      email: data.user.email,
    }
  },
  onError: async (error) => {
    if (error?.status === 401 || error?.code === 'PGRST301') {
      return { logout: true }
    }

    return { error }
  },
}
