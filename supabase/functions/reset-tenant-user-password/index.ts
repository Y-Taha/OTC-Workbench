import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type ResetTenantUserPasswordRequest = {
  tenantId?: string
  profileId?: string | number
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = requiredEnv('SUPABASE_URL')
    const anonKey = requiredEnv('SUPABASE_ANON_KEY')
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const payload = (await req.json()) as ResetTenantUserPasswordRequest
    const tenantId = payload.tenantId?.trim()
    const profileId = Number(payload.profileId)

    if (!tenantId) return jsonResponse({ error: 'Tenant is required' }, 400)
    if (!Number.isFinite(profileId) || profileId <= 0) return jsonResponse({ error: 'Profile is required' }, 400)

    const { data: callerData, error: callerError } = await userClient.auth.getUser()
    const caller = callerData.user

    if (callerError) throw callerError
    if (!caller) return jsonResponse({ error: 'You must be signed in to reset passwords.' }, 401)

    const { data: membership, error: membershipLookupError } = await userClient
      .from('tenant_memberships')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', caller.id)
      .maybeSingle()

    if (membershipLookupError) throw membershipLookupError

    const canManageTenantUsers = membership?.role === 'admin' || (await isPlatformAdmin(adminClient, caller.id))

    if (!canManageTenantUsers) {
      return jsonResponse({ error: 'Only tenant admins can reset user passwords.' }, 403)
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('auth_user_id')
      .eq('id', profileId)
      .eq('tenant_id', tenantId)
      .single()

    if (profileError) throw profileError
    if (!profile?.auth_user_id) return jsonResponse({ error: 'This profile is not linked to an auth user.' }, 400)

    const temporaryPassword = generateTemporaryPassword()
    const { error: resetError } = await adminClient.auth.admin.updateUserById(profile.auth_user_id, {
      password: temporaryPassword,
    })

    if (resetError) throw resetError

    return jsonResponse({ temporaryPassword }, 200)
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Could not reset password.' }, 500)
  }
})

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

async function isPlatformAdmin(adminClient: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await adminClient
    .from('tenant_memberships')
    .select('tenants!inner(slug)')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .eq('tenants.slug', 'admin')
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}
