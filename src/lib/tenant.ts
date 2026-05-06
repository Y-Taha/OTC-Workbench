import type {
  BaseRecord,
  CreateParams,
  CreateResponse,
  CrudFilters,
  DataProvider,
  DeleteOneParams,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetOneParams,
  GetOneResponse,
  UpdateParams,
  UpdateResponse,
} from '@refinedev/core'
import { dataProvider } from '@refinedev/supabase'
import { resources } from '../data/resources'
import { supabaseClient } from './supabaseClient'

export type Tenant = {
  id: string
  slug: string
  name: string
  isPlatformAdmin: boolean
}

type TenantMembership = {
  tenant_id: string
}

type TenantMembershipRole = 'admin' | 'member'
type ProfileRecord = BaseRecord & {
  auth_user_id?: string | null
  role?: TenantMembershipRole
}

const platformAdminTenantSlug = 'admin'
const reservedRootPaths = new Set(['login'])

export const tenantSlug = tenantSlugFromPath(window.location.pathname)
export const tenantBasePath = tenantSlug ? `/${tenantSlug}` : undefined

const tenantScopedViews = [
  'v_dashboard_kpis',
  'v_ip_portfolio_distribution',
  'v_research_projects_by_status',
  'v_research_funding_by_status',
  'v_fund_pipeline_by_title',
  'v_license_revenue_totals',
  'v_consultation_fees_by_status',
]

export const tenantScopedResources = new Set([...resources.map((resource) => resource.name), ...tenantScopedViews])

export function isTenantScopedResource(resource: string) {
  return tenantScopedResources.has(resource)
}

export function isPlatformAdminTenant(tenant: Tenant) {
  return tenant.isPlatformAdmin
}

export async function loadTenant() {
  if (!tenantSlug) {
    throw new Error('No tenant route was found. Use a tenant URL such as /default or /admin.')
  }

  const slug = tenantSlug.trim()
  const { data: tenant, error } = await supabaseClient
    .from('tenants')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  if (!tenant) {
    throw new Error(`Tenant "${slug}" is not configured. Create it through an admin migration or service-role workflow.`)
  }

  return { ...(tenant as Omit<Tenant, 'isPlatformAdmin'>), isPlatformAdmin: tenant.slug === platformAdminTenantSlug }
}

export async function loadSignedInUserTenantPath() {
  const { data: userData, error: userError } = await supabaseClient.auth.getUser()
  const user = userData.user

  if (userError) throw userError
  if (!user) throw new Error('Sign in before opening a tenant workspace.')

  const { data: memberships, error: membershipsError } = await supabaseClient
    .from('tenant_memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (membershipsError) throw membershipsError
  if (!memberships?.length) throw new Error('Your account is not assigned to a tenant workspace.')

  const tenantIds = (memberships as TenantMembership[]).map((membership) => membership.tenant_id)
  const { data: tenants, error: tenantsError } = await supabaseClient.from('tenants').select('id, slug').in('id', tenantIds)

  if (tenantsError) throw tenantsError
  if (!tenants?.length) throw new Error('Your tenant workspace could not be loaded.')

  const adminTenant = tenants.find((tenant) => tenant.slug === platformAdminTenantSlug)
  return `/${adminTenant?.slug ?? tenants[0].slug}`
}

export function createTenantDataProvider(tenant: Tenant): DataProvider {
  const baseProvider = dataProvider(supabaseClient) as DataProvider
  const tenantId = tenant.id

  const provider: DataProvider = {
    ...baseProvider,
    getList: async <TData extends BaseRecord = BaseRecord>(params: GetListParams): Promise<GetListResponse<TData>> => {
      if (params.resource === 'profiles') {
        const response = tenant.isPlatformAdmin
          ? await baseProvider.getList<ProfileRecord>(params)
          : await baseProvider.getList<ProfileRecord>({
              ...params,
              filters: withTenantFilter(params.filters, tenantId),
            })

        return {
          ...response,
          data: (await withProfileRoles(response.data, tenant)) as TData[],
        }
      }

      if (!isTenantScopedResource(params.resource)) return baseProvider.getList(params)
      if (tenant.isPlatformAdmin) return baseProvider.getList(params)

      return baseProvider.getList({
        ...params,
        filters: withTenantFilter(params.filters, tenantId),
      })
    },
    getOne: async <TData extends BaseRecord = BaseRecord>({ resource, id }: GetOneParams): Promise<GetOneResponse<TData>> => {
      if (resource === 'profiles') {
        const { data, error } = await (tenant.isPlatformAdmin
          ? supabaseClient.from(resource).select('*').eq('id', id)
          : supabaseClient.from(resource).select('*').eq('id', id).eq('tenant_id', tenantId)
        ).single()

        if (error) throw error
        const [profile] = await withProfileRoles([data as ProfileRecord], tenant)
        return { data: profile as TData }
      }

      if (!isTenantScopedResource(resource)) return baseProvider.getOne({ resource, id })
      if (tenant.isPlatformAdmin) return baseProvider.getOne({ resource, id })

      const { data, error } = await supabaseClient
        .from(resource)
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error
      return { data: data as TData }
    },
    create: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
      resource,
      variables,
    }: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
      if (!isTenantScopedResource(resource)) return baseProvider.create({ resource, variables })
      if (tenant.isPlatformAdmin) return baseProvider.create({ resource, variables })

      const { data, error } = await supabaseClient
        .from(resource)
        .insert({ ...(variables as Record<string, unknown>), tenant_id: tenantId })
        .select('*')
        .single()

      if (error) throw error
      return { data: data as TData }
    },
    update: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
      resource,
      id,
      variables,
    }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> => {
      if (!isTenantScopedResource(resource)) return baseProvider.update({ resource, id, variables })
      if (tenant.isPlatformAdmin) return baseProvider.update({ resource, id, variables })

      const { data, error } = await supabaseClient
        .from(resource)
        .update({ ...(variables as Record<string, unknown>), tenant_id: tenantId })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select('*')
        .single()

      if (error) throw error
      return { data: data as TData }
    },
    deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({
      resource,
      id,
    }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
      if (!isTenantScopedResource(resource)) return baseProvider.deleteOne({ resource, id })
      if (tenant.isPlatformAdmin) return baseProvider.deleteOne({ resource, id })

      const { data, error } = await supabaseClient
        .from(resource)
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select('*')
        .single()

      if (error) throw error
      return { data: data as TData }
    },
  }

  return provider
}

function withTenantFilter(filters: CrudFilters | undefined, tenantId: string): CrudFilters {
  const filterList = filters ?? []
  return [...filterList, { field: 'tenant_id', operator: 'eq', value: tenantId }]
}

async function withProfileRoles<TData extends ProfileRecord>(profiles: TData[], tenant: Tenant) {
  const authUserIds = profiles.map((profile) => profile.auth_user_id).filter((id): id is string => typeof id === 'string')

  if (!authUserIds.length) return profiles

  let membershipsQuery = supabaseClient.from('tenant_memberships').select('user_id, role').in('user_id', authUserIds)
  if (!tenant.isPlatformAdmin) membershipsQuery = membershipsQuery.eq('tenant_id', tenant.id)

  const { data: memberships, error } = await membershipsQuery
  if (error) throw error

  const roleByUserId = new Map((memberships || []).map((membership) => [membership.user_id, membership.role as TenantMembershipRole]))

  return profiles.map((profile) => ({
    ...profile,
    role: profile.auth_user_id ? roleByUserId.get(profile.auth_user_id) : undefined,
  }))
}

function tenantSlugFromPath(pathname: string) {
  const [firstSegment] = pathname.split('/').filter(Boolean)
  const normalizedSegment = firstSegment?.toLowerCase().trim()

  if (!normalizedSegment || reservedRootPaths.has(normalizedSegment)) return null

  return normalizedSegment
}

