import { useList, useNavigation, useTable } from '@refinedev/core'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { type FieldConfig, type ResourceConfig, resourceByName } from '../data/resources'
import { cascadeDeleteResource, cascadeDeleteWarning } from '../lib/cascadeDelete'
import { fileNameFromPath, filePathValue } from '../lib/storageFiles'
import { useTenant } from '../providers/TenantProvider'
import ConfirmDialog from './ConfirmDialog'

type Row = Record<string, unknown> & { id?: string | number }
type RelationOption = Record<string, unknown> & { id: string | number }

export default function ResourceList({ resourceName }: { resourceName: string }) {
  const resource = resourceByName[resourceName]
  const { create, edit, show } = useNavigation()
  const tenant = useTenant()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | number | null>(null)
  const [pendingDeleteRow, setPendingDeleteRow] = useState<Row | null>(null)
  const { tableQuery, result } = useTable<Row>({
    resource: resourceName,
    pagination: { pageSize: 25 },
  })

  const rows = result?.data || []
  const loading = tableQuery?.isLoading
  const error = tableQuery?.error

  if (!resource) return null

  async function deleteRow(row: Row) {
    if (!row.id || !resource) return

    setDeleteError(null)
    setDeletingId(row.id)

    try {
      await cascadeDeleteResource(resourceName, row.id, tenant)
      await tableQuery?.refetch?.()
      setPendingDeleteRow(null)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete this record.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Resource</p>
          <h1>{resource.label}</h1>
        </div>
        <button className="button primary" type="button" onClick={() => create(resourceName)}>
          <Plus size={16} />
          New
        </button>
      </div>

      <div className="page-card">
        {loading && <p className="muted">Loading {resource.label.toLowerCase()}...</p>}
        {error && (
          <p className="error">
            Could not load live records. Confirm Supabase env vars, migrations, and RLS policies.
          </p>
        )}
        {deleteError && <p className="error">Could not delete record: {deleteError}</p>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                {resource.table.map((fieldName) => (
                  <th key={fieldName}>{labelFor(resource, fieldName)}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={resource.table.length + 2} className="empty">
                    No records yet.
                  </td>
                </tr>
              )}

              {rows.map((row, index) => (
                <tr className="clickable-row" key={row.id || index} onClick={() => row.id && show(resourceName, row.id)}>
                  <td>{index + 1}</td>
                  {resource.table.map((fieldName) => {
                    const field = fieldFor(resource, fieldName)

                    return (
                      <td key={fieldName}>
                        <ResourceValue field={field} value={row[fieldName]} />
                      </td>
                    )
                  })}
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="View"
                        onClick={(event) => {
                          event.stopPropagation()
                          if (row.id) show(resourceName, row.id)
                        }}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="Edit"
                        onClick={(event) => {
                          event.stopPropagation()
                          if (row.id) edit(resourceName, row.id)
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button danger"
                        type="button"
                        aria-label="Delete"
                        disabled={deletingId === row.id}
                        onClick={(event) => {
                          event.stopPropagation()
                          setPendingDeleteRow(row)
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(pendingDeleteRow)}
        title={`Delete ${resource.label} record?`}
        message={cascadeDeleteWarning(resource.label)}
        confirmLabel="Delete"
        variant="danger"
        loading={pendingDeleteRow ? deletingId === pendingDeleteRow.id : false}
        onCancel={() => {
          if (!deletingId) setPendingDeleteRow(null)
        }}
        onConfirm={() => {
          if (pendingDeleteRow) void deleteRow(pendingDeleteRow)
        }}
      />
    </section>
  )
}

function labelFor(resource: ResourceConfig, fieldName: string) {
  return fieldFor(resource, fieldName)?.label || fieldName.replaceAll('_', ' ')
}

function fieldFor(resource: ResourceConfig, fieldName: string) {
  return resource.fields.find((field) => field.name === fieldName)
}

function ResourceValue({ field, value }: { field?: FieldConfig; value: unknown }) {
  if (field?.type === 'relation' && field.resource) {
    return <RelationValue resource={field.resource} value={value} />
  }

  if (field?.type === 'relation-multi' && field.resource) {
    return <RelationMultiValue resource={field.resource} value={value} />
  }

  if (field?.type === 'file') {
    const path = filePathValue(value)
    return <>{path ? fileNameFromPath(path) : '-'}</>
  }

  return <>{formatValue(value)}</>
}

function RelationValue({ resource, value }: { resource: string; value: unknown }) {
  const { result } = useList<RelationOption>({
    resource,
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false },
  })
  const option = (result?.data || []).find((item: RelationOption) => String(item.id) === String(value))

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
    .filter((item: RelationOption) => values.includes(String(item.id)))
    .map((item: RelationOption) => relationLabel(item))

  return <>{labels.length ? labels.join(', ') : formatValue(value)}</>
}

function relationLabel(option: RelationOption) {
  return String(option.name || option.title || option.email || option.id)
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
