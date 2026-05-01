import type {
  BaseRecord,
  CreateParams,
  CreateResponse,
  CrudFilters,
  DataProvider,
  DeleteOneParams,
  DeleteOneResponse,
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

const platformAdminTenantSlug = 'admin'

export const tenantSlug = tenantSlugFromHost(window.location.hostname)

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
    throw new Error('No tenant subdomain was found. Use a tenant subdomain such as default.example.com or admin.example.com.')
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

export function createTenantDataProvider(tenant: Tenant): DataProvider {
  const baseProvider = dataProvider(supabaseClient) as DataProvider
  const tenantId = tenant.id

  const provider: DataProvider = {
    ...baseProvider,
    getList: (params) => {
      if (!isTenantScopedResource(params.resource)) return baseProvider.getList(params)
      if (tenant.isPlatformAdmin) return baseProvider.getList(params)

      return baseProvider.getList({
        ...params,
        filters: withTenantFilter(params.filters, tenantId),
      })
    },
    getOne: async <TData extends BaseRecord = BaseRecord>({ resource, id }: GetOneParams): Promise<GetOneResponse<TData>> => {
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

function tenantSlugFromHost(hostname: string) {
  const normalizedHostname = hostname.toLowerCase().trim()

  if (!normalizedHostname || normalizedHostname === 'localhost' || isIpAddress(normalizedHostname)) {
    return null
  }

  const labels = normalizedHostname.split('.').filter(Boolean)
  if (labels.length === 2 && labels[1] === 'localhost') return labels[0]
  if (labels.length < 3 || labels[0] === 'www') return null

  return labels[0]
}

function isIpAddress(hostname: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')
}

