import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type CreateTenantUserRequest = {
  tenantId?: string
  name?: string
  title?: string | null
  mobile?: string | null
  email?: string
  department?: string | null
  affiliation_status?: string | null
  entity_id?: number | null
  role?: 'admin' | 'member'
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
    const payload = (await req.json()) as CreateTenantUserRequest
    const tenantId = payload.tenantId?.trim()
    const email = payload.email?.trim().toLowerCase()
    const temporaryPassword = generateTemporaryPassword()
    const name = payload.name?.trim()
    const role = payload.role === 'admin' ? 'admin' : 'member'

    if (!tenantId) return jsonResponse({ error: 'Tenant is required' }, 400)
    if (!name) return jsonResponse({ error: 'Name is required' }, 400)
    if (!email) return jsonResponse({ error: 'Email is required' }, 400)

    const { data: callerData, error: callerError } = await userClient.auth.getUser()
    const caller = callerData.user

    if (callerError) throw callerError
    if (!caller) return jsonResponse({ error: 'You must be signed in to create users.' }, 401)

    const { data: membership, error: membershipLookupError } = await userClient
      .from('tenant_memberships')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', caller.id)
      .maybeSingle()

    if (membershipLookupError) throw membershipLookupError

    const canManageTenantUsers = membership?.role === 'admin' || (await isPlatformAdmin(adminClient, caller.id))

    if (!canManageTenantUsers) {
      return jsonResponse({ error: 'Only tenant admins can create users.' }, 403)
    }

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
      },
      app_metadata: {
        tenant_id: tenantId,
      },
    })

    if (authError) throw authError

    const authUserId = authData.user?.id
    if (!authUserId) throw new Error('Supabase Auth did not return a user id.')

    const profilePayload = {
      tenant_id: tenantId,
      auth_user_id: authUserId,
      entity_id: payload.entity_id ?? null,
      name,
      title: payload.title || null,
      mobile: payload.mobile || null,
      email,
      department: payload.department || null,
      affiliation_status: payload.affiliation_status || null,
    }

    const { data: profile, error: profileError } = await adminClient.from('profiles').insert(profilePayload).select('*').single()

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authUserId)
      throw profileError
    }

    const { error: membershipError } = await adminClient.from('tenant_memberships').insert({
      tenant_id: tenantId,
      user_id: authUserId,
      role,
    })

    if (membershipError) {
      await adminClient.from('profiles').delete().eq('id', profile.id)
      await adminClient.auth.admin.deleteUser(authUserId)
      throw membershipError
    }

    return jsonResponse({ data: profile, temporaryPassword }, 200)
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Could not create user.' }, 500)
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
