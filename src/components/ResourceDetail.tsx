import { useList, useNavigation, useOne } from '@refinedev/core'
import { Pencil } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { type FieldConfig, resourceByName } from '../data/resources'

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
  const record = (result?.data ?? null) as Row | null

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
  return ['textarea', 'json', 'relation-multi', 'multi', 'ip-multi'].includes(field.type) ? 'detail-item wide' : 'detail-item'
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

  if (field.type === 'file') return <>{value ? 'Uploaded' : '-'}</>
  return <>{formatValue(value)}</>
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
