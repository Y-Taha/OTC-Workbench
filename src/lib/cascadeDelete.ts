import { ipResourceByType } from '../data/resources'
import { supabaseClient } from './supabaseClient'
import type { Tenant } from './tenant'

type Row = Record<string, unknown> & { id?: string | number }
type Filters = Record<string, unknown>
type QueryResult = { data?: unknown; error?: unknown }
type FilterableQuery = PromiseLike<QueryResult> & {
  eq: (column: string, value: unknown) => FilterableQuery
}

const assessmentTables = ['trl_assessments', 'mrl_assessments', 'crl_assessments'] as const
const ipTypeByResource = new Map(Object.entries(ipResourceByType).map(([ipType, resource]) => [resource, ipType]))
const ipResourceNames = new Set(ipTypeByResource.keys())

export function cascadeDeleteWarning(resourceLabel: string) {
  return [
    `Delete this ${resourceLabel.toLowerCase()} record?`,
    '',
    'This will also remove dependent links and child records where needed so the record can be deleted cleanly.',
    'This action cannot be undone.',
  ].join('\n')
}

export async function cascadeDeleteResource(resource: string, id: string | number, tenant: Tenant) {
  const recordId = Number(id)
  if (!Number.isFinite(recordId) || recordId <= 0) throw new Error('A valid record id is required before deleting.')

  await deleteResource(resource, recordId, tenant, new Set())
}

async function deleteResource(resource: string, id: number, tenant: Tenant, visited: Set<string>) {
  const key = `${resource}:${id}`
  if (visited.has(key)) return
  visited.add(key)

  await cleanupDependencies(resource, id, tenant, visited)

  const { error } = await scope(supabaseClient.from(resource).delete().eq('id', id), tenant)
  if (error) throw error
}

async function cleanupDependencies(resource: string, id: number, tenant: Tenant, visited: Set<string>) {
  if (resource === 'entities') {
    await deleteChildren('funds', 'funding_entity_id', id, tenant, visited)
    await updateWhere('profiles', { entity_id: null }, { entity_id: id }, tenant)
    await deleteChildren('licenses', 'licensee_id', id, tenant, visited)
    await deleteChildren('consultations', 'company_id', id, tenant, visited)
    await deleteChildren('equipment', 'hosting_entity_id', id, tenant, visited)
    await deleteChildren('industry_problem_statements', 'entity_id', id, tenant, visited)
    await deleteChildren('industry_common_challenges', 'entity_id', id, tenant, visited)
    await deleteWhere('idf_applicants', { entity_applicant_id: id }, tenant)
    await deleteWhere('ip_applicants', { entity_applicant_id: id }, tenant)
    await deleteWhere('license_licensors', { entity_licensor_id: id }, tenant)
    return
  }

  if (resource === 'profiles') {
    await deleteChildren('research', 'pi_user_id', id, tenant, visited)
    await deleteChildren('consultations', 'consultant_id', id, tenant, visited)
    await deleteChildren('equipment', 'contact_person_id', id, tenant, visited)
    await updateWhere('invention_disclosures', { assessment_user_id: null }, { assessment_user_id: id }, tenant)
    await updateWhere('invention_disclosures', { lead_inventor_id: null }, { lead_inventor_id: id }, tenant)
    await deleteWhere('research_team_member', { user_id: id }, tenant)
    await deleteWhere('idf_inventors', { user_id: id }, tenant)
    await deleteWhere('idf_applicants', { user_applicant_id: id }, tenant)
    await deleteWhere('ip_inventors', { user_id: id }, tenant)
    await deleteWhere('ip_applicants', { user_applicant_id: id }, tenant)
    await deleteWhere('license_licensors', { user_licensor_id: id }, tenant)
    return
  }

  if (resource === 'funds') {
    await deleteWhere('research_fund', { fund_id: id }, tenant)
    await deleteWhere('idf_fund', { fund_id: id }, tenant)
    await updateIpResources({ fund_id: null }, { fund_id: id }, tenant)
    await updateWhere('consultations', { fund_id: null }, { fund_id: id }, tenant)
    await updateWhere('equipment', { fund_id: null }, { fund_id: id }, tenant)
    return
  }

  if (resource === 'research_areas') {
    await deleteWhere('research_research_area', { research_area_id: id }, tenant)
    return
  }

  if (resource === 'research') {
    await updateWhere('research', { previous_research_id: null }, { previous_research_id: id }, tenant)
    await updateWhere('invention_disclosures', { research_id: null }, { research_id: id }, tenant)
    await unlinkAssessments({ research_id: id }, { research_id: null }, tenant, visited)
    await unlinkConsultations({ research_id: id }, { research_id: null }, tenant, visited)
    await updateWhere('equipment', { research_id: null }, { research_id: id }, tenant)
    return
  }

  if (resource === 'invention_disclosures') {
    await deleteChildren('prior_art_searches', 'invention_disclosure_id', id, tenant, visited)
    await unlinkConsultations({ invention_disclosure_id: id }, { invention_disclosure_id: null }, tenant, visited)
    return
  }

  if (resource === 'prior_art_searches') {
    await updateIpResources({ prior_art_search_id: null }, { prior_art_search_id: id }, tenant)
    await unlinkAssessments({ prior_art_search_id: id }, { prior_art_search_id: null }, tenant, visited)
    return
  }

  if (ipResourceNames.has(resource)) {
    const ipType = ipTypeByResource.get(resource) || ''
    await deleteWhere('ip_inventors', { ip_type: ipType, ip_id: id }, tenant)
    await deleteWhere('ip_applicants', { ip_type: ipType, ip_id: id }, tenant)
    await deleteChildren('licenses', 'ip_id', id, tenant, visited, { ip_type: ipType })
    await unlinkAssessments({ ip_type: ipType, ip_id: id }, { ip_type: null, ip_id: null }, tenant, visited)
    await removeAssociatedIpFromSolutions(`${ipType}:${id}`, tenant, visited)
    return
  }

  if (resource === 'licenses') {
    return
  }

  if (resource === 'consultations') {
    await unlinkSolutionsFromConsultation(id, tenant, visited)
    return
  }

  if (resource === 'industry_common_challenges') {
    await deleteChildren('solutions', 'industry_common_challenge_id', id, tenant, visited)
  }
}

async function deleteChildren(
  resource: string,
  column: string,
  value: unknown,
  tenant: Tenant,
  visited: Set<string>,
  extraFilters: Filters = {},
) {
  const children = await selectRows(resource, { [column]: value, ...extraFilters }, tenant)

  for (const child of children) {
    if (child.id !== undefined) await deleteResource(resource, Number(child.id), tenant, visited)
  }
}

async function unlinkAssessments(filters: Filters, patch: Filters, tenant: Tenant, visited: Set<string>) {
  for (const table of assessmentTables) {
    const rows = await selectRows(table, filters, tenant)

    for (const row of rows) {
      const next = { ...row, ...patch }
      const hasLink = Boolean(next.research_id || next.prior_art_search_id || next.ip_id)

      if (!hasLink && row.id !== undefined) {
        await deleteResource(table, Number(row.id), tenant, visited)
      } else if (row.id !== undefined) {
        await updateWhere(table, patch, { id: row.id }, tenant)
      }
    }
  }
}

async function unlinkConsultations(filters: Filters, patch: Filters, tenant: Tenant, visited: Set<string>) {
  const rows = await selectRows('consultations', filters, tenant)

  for (const row of rows) {
    const next = { ...row, ...patch }
    const hasLink = Boolean(next.research_id || next.invention_disclosure_id)

    if (!hasLink && row.id !== undefined) {
      await deleteResource('consultations', Number(row.id), tenant, visited)
    } else if (row.id !== undefined) {
      await updateWhere('consultations', patch, { id: row.id }, tenant)
    }
  }
}

async function unlinkSolutionsFromConsultation(consultationId: number, tenant: Tenant, visited: Set<string>) {
  const rows = await selectRows('solutions', { consultation_id: consultationId }, tenant)

  for (const row of rows) {
    const associatedIp = Array.isArray(row.associated_ip) ? row.associated_ip : []

    if (associatedIp.length === 0 && row.id !== undefined) {
      await deleteResource('solutions', Number(row.id), tenant, visited)
    } else if (row.id !== undefined) {
      await updateWhere('solutions', { consultation_id: null }, { id: row.id }, tenant)
    }
  }
}

async function removeAssociatedIpFromSolutions(associatedIpValue: string, tenant: Tenant, visited: Set<string>) {
  const rows = await selectRows('solutions', {}, tenant)

  for (const row of rows) {
    const associatedIp = Array.isArray(row.associated_ip) ? row.associated_ip.map(String) : []
    if (!associatedIp.includes(associatedIpValue)) continue

    const nextAssociatedIp = associatedIp.filter((item) => item !== associatedIpValue)
    if (nextAssociatedIp.length === 0 && !row.consultation_id && row.id !== undefined) {
      await deleteResource('solutions', Number(row.id), tenant, visited)
    } else if (row.id !== undefined) {
      await updateWhere('solutions', { associated_ip: nextAssociatedIp }, { id: row.id }, tenant)
    }
  }
}

async function updateIpResources(patch: Filters, filters: Filters, tenant: Tenant) {
  for (const resource of ipResourceNames) {
    await updateWhere(resource, patch, filters, tenant)
  }
}

async function selectRows(table: string, filters: Filters, tenant: Tenant) {
  let query = scope(supabaseClient.from(table).select('*') as unknown as FilterableQuery, tenant)
  query = applyFilters(query, filters)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as Row[]
}

async function updateWhere(table: string, patch: Filters, filters: Filters, tenant: Tenant) {
  let query = scope(supabaseClient.from(table).update(patch) as unknown as FilterableQuery, tenant)
  query = applyFilters(query, filters)

  const { error } = await query
  if (error) throw error
}

async function deleteWhere(table: string, filters: Filters, tenant: Tenant) {
  let query = scope(supabaseClient.from(table).delete() as unknown as FilterableQuery, tenant)
  query = applyFilters(query, filters)

  const { error } = await query
  if (error) throw error
}

function applyFilters(query: FilterableQuery, filters: Filters) {
  return Object.entries(filters).reduce((currentQuery, [column, value]) => currentQuery.eq(column, value), query)
}

function scope(query: FilterableQuery, tenant: Tenant) {
  return tenant.isPlatformAdmin ? query : query.eq('tenant_id', tenant.id)
}
