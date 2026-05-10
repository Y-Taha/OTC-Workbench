import { useList, useNavigation, useOne } from '@refinedev/core'
import { Pencil } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { type FieldConfig, resourceByName } from '../data/resources'
import StorageFileLink from './StorageFileLink'

type Row = Record<string, unknown> & { id?: string | number }
type RelationOption = Record<string, unknown> & { id: string | number }

export default function ResourceDetail({ resourceName }: { resourceName: string }) {
  const resource = resourceByName[resourceName]
  const { id } = useParams()
  const { edit, list } = useNavigation()
  const { result, query } = useOne<Row>({
    resource: resourceName,
    id,
    queryOptions: { enabled: Boolean(id), retry: false },
  })
  const record = (result ?? null) as Row | null

  if (!resource) return null

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">View resource</p>
          <h1>{resource.label}</h1>
        </div>
        <div className="form-actions">
          <button className="button secondary" type="button" onClick={() => list(resourceName)}>
            Back to list
          </button>
          <button className="button primary" type="button" onClick={() => id && edit(resourceName, id)}>
            <Pencil size={16} />
            Edit
          </button>
        </div>
      </div>

      <div className="page-card detail-grid">
        {query?.isLoading && <p className="muted wide">Loading record...</p>}
        {query?.error && <p className="error wide">Could not load this record.</p>}
        {!query?.isLoading && !query?.error && !record && <p className="empty wide">Record not found.</p>}
        {record &&
          resource.fields
            .filter((field) => isVisible(field, record))
            .map((field) => (
              <div className={detailClassName(field)} key={field.name}>
                <span>{field.label}</span>
                <strong>
                  <DetailValue field={field} value={record[field.name]} />
                </strong>
              </div>
            ))}
      </div>
    </section>
  )
}

function detailClassName(field: FieldConfig) {
  return [
    'textarea',
    'json',
    'relation-multi',
    'multi',
    'ip-multi',
    'fund-repeater',
    'inventor-repeater',
    'applicant-repeater',
    'licensor-repeater',
    'milestone-repeater',
  ].includes(field.type) ? 'detail-item wide' : 'detail-item'
}

function isVisible(field: FieldConfig, values: Row) {
  if (!field.showWhen) return true
  return values[field.showWhen.field] === field.showWhen.value
}

function DetailValue({ field, value }: { field: FieldConfig; value: unknown }) {
  if (field.type === 'relation' && field.resource === 'prior_art_searches') {
    return <PriorArtSearchValue value={value} />
  }

  if (field.type === 'relation' && field.resource) {
    return <RelationValue resource={field.resource} value={value} />
  }

  if (field.type === 'relation-multi' && field.resource) {
    return <RelationMultiValue resource={field.resource} value={value} />
  }

  if (field.type === 'file') return <StorageFileLink fieldName={field.name} value={value} label="View uploaded file" />
  if (field.type === 'inventor-repeater') return <InventorRepeaterValue value={value} />
  if (field.type === 'applicant-repeater') return <ApplicantRepeaterValue value={value} />
  if (field.type === 'fund-repeater') return <FundRepeaterValue value={value} />
  if (field.type === 'licensor-repeater') return <LicensorRepeaterValue value={value} />
  if (field.type === 'milestone-repeater') return <MilestoneRepeaterValue value={value} />
  return <>{formatValue(value)}</>
}

function InventorRepeaterValue({ value }: { value: unknown }) {
  const rows = asRows(value)
  const { result } = useList<RelationOption>({
    resource: 'profiles',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false, enabled: rows.length > 0 },
  })
  const userById = optionMap(result?.data || [])

  if (!rows.length) return <>-</>

  return (
    <div className="detail-list">
      {rows.map((row, index) => (
        <div className="detail-list-row" key={index}>
          <span>{relationLabelForId(userById, row.user_id, 'Inventor')}</span>
          {row.contribution_percentage ? <small>{String(row.contribution_percentage)}% contribution</small> : null}
          {row.contribution_description ? <small>{String(row.contribution_description)}</small> : null}
        </div>
      ))}
    </div>
  )
}

function ApplicantRepeaterValue({ value }: { value: unknown }) {
  const rows = asRows(value)
  const { result: usersResult } = useList<RelationOption>({
    resource: 'profiles',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false, enabled: rows.length > 0 },
  })
  const { result: entitiesResult } = useList<RelationOption>({
    resource: 'entities',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false, enabled: rows.length > 0 },
  })
  const userById = optionMap(usersResult?.data || [])
  const entityById = optionMap(entitiesResult?.data || [])

  if (!rows.length) return <>-</>

  return (
    <div className="detail-list">
      {rows.map((row, index) => (
        <div className="detail-list-row" key={index}>
          <span>{applicantLabel(row, userById, entityById)}</span>
          {row.ownership_percentage ? <small>{String(row.ownership_percentage)}% ownership</small> : null}
        </div>
      ))}
    </div>
  )
}

function FundRepeaterValue({ value }: { value: unknown }) {
  const rows = asRows(value)
  const { result } = useList<RelationOption>({
    resource: 'funds',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false, enabled: rows.length > 0 },
  })
  const fundById = optionMap(result?.data || [])

  if (!rows.length) return <>-</>

  return (
    <div className="detail-list">
      {rows.map((row, index) => (
        <div className="detail-list-row" key={index}>
          <span>{relationLabelForId(fundById, row.fund_id, 'Fund')}</span>
          {row.amount ? <small>{Number(row.amount).toLocaleString()}</small> : null}
        </div>
      ))}
    </div>
  )
}

function LicensorRepeaterValue({ value }: { value: unknown }) {
  const rows = asRows(value)
  const { result: usersResult } = useList<RelationOption>({
    resource: 'profiles',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false, enabled: rows.length > 0 },
  })
  const { result: entitiesResult } = useList<RelationOption>({
    resource: 'entities',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false, enabled: rows.length > 0 },
  })
  const userById = optionMap(usersResult?.data || [])
  const entityById = optionMap(entitiesResult?.data || [])

  if (!rows.length) return <>-</>

  return (
    <div className="detail-list">
      {rows.map((row, index) => (
        <div className="detail-list-row" key={index}>
          <span>{licensorLabel(row, userById, entityById)}</span>
        </div>
      ))}
    </div>
  )
}

function MilestoneRepeaterValue({ value }: { value: unknown }) {
  const rows = asRows(value)
  if (!rows.length) return <>-</>

  return (
    <div className="detail-list">
      {rows.map((row, index) => (
        <div className="detail-list-row" key={index}>
          <span>{String(row.description || `Milestone ${index + 1}`)}</span>
          {row.amount ? <small>{Number(row.amount).toLocaleString()}</small> : null}
        </div>
      ))}
    </div>
  )
}

function PriorArtSearchValue({ value }: { value: unknown }) {
  const { result } = useList<RelationOption>({
    resource: 'prior_art_searches',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false },
  })
  const { result: idfResult } = useList<RelationOption>({
    resource: 'invention_disclosures',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false },
  })
  const option = (result?.data || []).find((item) => String(item.id) === String(value))
  const idfById = new Map((idfResult?.data || []).map((idf) => [String(idf.id), relationLabel(idf)]))

  return <>{option ? priorArtSearchLabel(option, idfById) : formatValue(value)}</>
}

function RelationValue({ resource, value }: { resource: string; value: unknown }) {
  const { result } = useList<RelationOption>({
    resource,
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false },
  })
  const option = (result?.data || []).find((item) => String(item.id) === String(value))

  return <>{option ? relationLabel(option) : formatValue(value)}</>
}

function RelationMultiValue({ resource, value }: { resource: string; value: unknown }) {
  const values = Array.isArray(value) ? value.map(String) : []
  const { result } = useList<RelationOption>({
    resource,
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false },
  })
  const labels = (result?.data || [])
    .filter((item) => values.includes(String(item.id)))
    .map((item) => relationLabel(item))

  return <>{labels.length ? labels.join(', ') : formatValue(value)}</>
}

function relationLabel(option: RelationOption) {
  return String(option.name || option.title || option.email || option.id)
}

function optionMap(options: RelationOption[]) {
  return new Map(options.map((option) => [String(option.id), relationLabel(option)]))
}

function relationLabelForId(optionsById: Map<string, string>, value: unknown, fallback: string) {
  if (!value) return fallback
  return optionsById.get(String(value)) || `${fallback} ${value}`
}

function applicantLabel(row: RepeaterRow, userById: Map<string, string>, entityById: Map<string, string>) {
  if (row.user_applicant_id) return `User: ${relationLabelForId(userById, row.user_applicant_id, 'User')}`
  if (row.entity_applicant_id) return `Entity: ${relationLabelForId(entityById, row.entity_applicant_id, 'Entity')}`
  return 'Applicant'
}

function licensorLabel(row: RepeaterRow, userById: Map<string, string>, entityById: Map<string, string>) {
  if (row.user_licensor_id) return `User: ${relationLabelForId(userById, row.user_licensor_id, 'User')}`
  if (row.entity_licensor_id) return `Entity: ${relationLabelForId(entityById, row.entity_licensor_id, 'Entity')}`
  return 'Licensor'
}

function priorArtSearchLabel(option: RelationOption, idfById: Map<string, string>) {
  const disclosureLabel = idfById.get(String(option.invention_disclosure_id || ''))
  if (disclosureLabel) return disclosureLabel
  return `Prior Art Search ${option.id}`
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

type RepeaterRow = Record<string, unknown>

function asRows(value: unknown): RepeaterRow[] {
  return Array.isArray(value) ? (value.filter((item) => item && typeof item === 'object') as RepeaterRow[]) : []
}
