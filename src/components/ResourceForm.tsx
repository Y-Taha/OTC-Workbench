import type { ChangeEvent, FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useList, useNavigation, useOne } from '@refinedev/core'
import { useParams } from 'react-router-dom'
import { ipResourceByType, type FieldConfig, resourceByName } from '../data/resources'
import { isPlatformAdminTenant, isTenantScopedResource } from '../lib/tenant'
import { supabaseClient } from '../lib/supabaseClient'
import { useTenant } from '../providers/TenantProvider'

type ResourceFormProps = {
  resourceName: string
  mode: 'create' | 'edit'
}

type DraftValue = string | number | boolean | string[] | number[] | unknown[] | null
type Draft = Record<string, DraftValue>
type FileDraft = Record<string, File | null>
type RelationOption = Record<string, unknown> & { id: string | number }
type RepeaterRow = Record<string, unknown>
type CreateTenantUserResponse = {
  data?: { id: string | number }
  temporaryPassword?: string
  error?: string
}
type ResetTenantUserPasswordResponse = {
  temporaryPassword?: string
  error?: string
}

const bucketByField: Record<string, string> = {
  logo_path: 'logos',
  diagrams_path: 'documents',
  contractual_obligations_files_path: 'contracts',
  prior_art_report_path: 'reports',
  trl_report_path: 'reports',
  mrl_report_path: 'reports',
  commercial_assessment_report_path: 'reports',
  drawings_path: 'documents',
  original_document_path: 'documents',
  office_search_report_path: 'reports',
  compliance_document_path: 'documents',
  licensing_document_path: 'contracts',
  invoice_path: 'invoices',
  contract_path: 'contracts',
}

const emptyValue = (field: FieldConfig): DraftValue => {
  if (field.type === 'boolean') return false
  if (
    field.type === 'multi' ||
    field.type === 'relation-multi' ||
    field.type === 'ip-multi' ||
    field.type === 'json' ||
    field.type === 'fund-repeater' ||
    field.type === 'inventor-repeater' ||
    field.type === 'applicant-repeater' ||
    field.type === 'licensor-repeater' ||
    field.type === 'milestone-repeater'
  ) return []
  return ''
}

const normalizeValue = (field: FieldConfig, value: DraftValue) => {
  if (field.type === 'number') return value === '' || value === null ? null : Number(value)
  if (field.type === 'boolean') return Boolean(value)
  if (
    field.type === 'multi' ||
    field.type === 'relation-multi' ||
    field.type === 'ip-multi' ||
    field.type === 'json' ||
    field.type === 'fund-repeater' ||
    field.type === 'inventor-repeater' ||
    field.type === 'applicant-repeater' ||
    field.type === 'licensor-repeater' ||
    field.type === 'milestone-repeater'
  ) return Array.isArray(value) ? value : []
  if (field.type === 'relation' || field.type === 'ip-relation') return value === '' || value === null ? null : Number(value)
  return value || null
}

const safeFileName = (fileName: string) => fileName.replace(/[^a-zA-Z0-9._-]/g, '-')

const storagePathFor = (tenantSlug: string, resourceName: string, fieldName: string, file: File) =>
  `tenants/${tenantSlug}/${resourceName}/${fieldName}/${crypto.randomUUID()}-${safeFileName(file.name)}`

export default function ResourceForm({ resourceName, mode }: ResourceFormProps) {
  const resource = resourceByName[resourceName]
  const tenant = useTenant()
  const { id } = useParams()
  const { list } = useNavigation()
  const { result, query } = useOne<Draft>({
    resource: resourceName,
    id,
    queryOptions: {
      enabled: mode === 'edit' && Boolean(id),
    },
  })

  const defaults = useMemo<Draft>(
    () => Object.fromEntries(formFields(resourceName, mode, resource.fields).map((field) => [field.name, emptyValue(field)])),
    [mode, resource.fields, resourceName],
  )

  const [draft, setDraft] = useState<Draft>({})
  const [files, setFiles] = useState<FileDraft>({})
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [createdUserPassword, setCreatedUserPassword] = useState<string | null>(null)
  const record = (result || {}) as Draft
  const values = mode === 'edit' ? { ...defaults, ...record, ...draft } : { ...defaults, ...draft }

  const setValue = (field: FieldConfig, value: DraftValue) => {
    setDraft((current) => ({ ...current, [field.name]: value }))
  }

  const setFile = (field: FieldConfig, file: File | null) => {
    setFiles((current) => ({ ...current, [field.name]: file }))
  }

  const uploadFiles = async () => {
    const uploadedPaths: Record<string, string> = {}

    for (const field of resource.fields.filter((item) => item.type === 'file')) {
      const file = files[field.name]
      if (!file) continue

      const bucket = bucketByField[field.name] || 'documents'
      const path = storagePathFor(tenant.slug, resourceName, field.name, file)
      const { error } = await supabaseClient.storage.from(bucket).upload(path, file, {
        upsert: false,
      })

      if (error) throw new Error(`${field.label}: ${error.message}`)
      uploadedPaths[field.name] = path
    }

    return uploadedPaths
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUploadError(null)
    setIsUploading(true)
    setIsSaving(true)

    try {
      const uploadedPaths = await uploadFiles()
      const payload = Object.fromEntries(
        formFields(resourceName, mode, resource.fields)
          .filter((field) => !field.readOnly)
          .map((field) => [
            field.name,
            field.type === 'file'
              ? uploadedPaths[field.name] || normalizeValue(field, values[field.name])
              : normalizeValue(field, values[field.name]),
          ]),
      )
      applyCalculatedFields(resourceName, payload)
      validatePayload(resourceName, payload)
      const tenantScoped = isTenantScopedResource(resourceName)
      const recordTenantId = typeof record.tenant_id === 'string' ? record.tenant_id : tenant.id
      if (tenantScoped && (!isPlatformAdminTenant(tenant) || mode === 'create')) payload.tenant_id = tenant.id

      if (mode === 'edit') {
        const tablePayload = resourceName === 'profiles' ? withoutProfileVirtualFields(payload) : payload
        const updateQuery = supabaseClient.from(resourceName).update(tablePayload).eq('id', id)
        const { data: updatedRecord, error } = await (isPlatformAdminTenant(tenant) || !tenantScoped
          ? updateQuery
          : updateQuery.eq('tenant_id', tenant.id)
        )
          .select('id')
          .single()

        if (error) throw error
        if (resourceName === 'profiles') {
          await updateProfileRole(tenant.id, record.auth_user_id, payload.role)
        }
        await syncPivotTables(resourceName, Number(updatedRecord.id), recordTenantId, payload)
        list(resourceName)
        return
      }

      if (resourceName === 'profiles') {
        const { profile, temporaryPassword } = await createTenantAuthUser(tenant.id, payload)
        const createdRecord = profile
        await syncPivotTables(resourceName, Number(createdRecord.id), tenant.id, payload)
        setCreatedUserPassword(temporaryPassword)
        setDraft({})
        return
      }

      const { data: createdRecord, error } = await supabaseClient.from(resourceName).insert(payload).select('id').single()

      if (error) throw error
      await syncPivotTables(resourceName, Number(createdRecord.id), tenant.id, payload)
      list(resourceName)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'File upload failed')
    } finally {
      setIsUploading(false)
      setIsSaving(false)
    }
  }

  if (!resource) return null
  if (mode === 'edit' && query?.isLoading) return <div className="page-card">Loading record...</div>
  if (createdUserPassword) {
    return (
      <section className="page">
        <TemporaryPasswordPanel
          title="User created"
          password={createdUserPassword}
          onBack={() => list(resourceName)}
          description="Share this temporary password with the user. It will only be shown now."
        />
      </section>
    )
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{mode === 'edit' ? 'Edit' : 'Create'} resource</p>
          <h1>{resource.label}</h1>
        </div>
        <button className="button secondary" type="button" onClick={() => list(resourceName)}>
          Back to list
        </button>
      </div>

      <form className="form-grid page-card" onSubmit={submit}>
        {formFields(resourceName, mode, resource.fields).filter((field) => isVisible(field, values)).map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            value={values[field.name]}
            selectedFile={files[field.name] || null}
            values={values}
            onChange={(value) => setValue(field, value)}
            onFileChange={(file) => setFile(field, file)}
          />
        ))}

        {uploadError && <p className="error wide">{uploadError}</p>}

        <div className="form-actions">
          <button className="button primary" type="submit" disabled={isSaving || isUploading}>
            {isSaving || isUploading ? 'Saving...' : 'Save'}
          </button>
          <button className="button secondary" type="button" onClick={() => list(resourceName)}>
            Cancel
          </button>
        </div>
      </form>

      {resourceName === 'profiles' && mode === 'edit' && typeof id === 'string' && (
        <ResetPasswordSection profileId={id} tenantId={tenant.id} />
      )}
    </section>
  )
}

function formFields(_resourceName: string, _mode: 'create' | 'edit', fields: FieldConfig[]) {
  return fields
}

async function createTenantAuthUser(tenantId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseClient.functions.invoke<CreateTenantUserResponse>('create-tenant-user', {
    body: {
      tenantId,
      entity_id: nullableNumber(payload.entity_id),
      name: payload.name,
      title: payload.title,
      mobile: payload.mobile,
      email: payload.email,
      department: payload.department,
      affiliation_status: payload.affiliation_status,
      role: payload.role,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  if (!data?.data?.id) throw new Error('User was created but no app user id was returned.')
  if (!data.temporaryPassword) throw new Error('User was created but no temporary password was returned.')

  return { profile: data.data, temporaryPassword: data.temporaryPassword }
}

function withoutProfileVirtualFields(payload: Record<string, unknown>) {
  const { role: _role, ...tablePayload } = payload
  return tablePayload
}

async function updateProfileRole(tenantId: string, authUserId: unknown, role: unknown) {
  if (role !== 'admin' && role !== 'member') return
  if (typeof authUserId !== 'string') throw new Error('This profile is not linked to an auth user.')

  const { error } = await supabaseClient
    .from('tenant_memberships')
    .update({ role })
    .eq('tenant_id', tenantId)
    .eq('user_id', authUserId)

  if (error) throw error
}

async function resetTenantUserPassword(tenantId: string, profileId: string) {
  const { data, error } = await supabaseClient.functions.invoke<ResetTenantUserPasswordResponse>('reset-tenant-user-password', {
    body: {
      tenantId,
      profileId,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  if (!data?.temporaryPassword) throw new Error('Password was reset but no temporary password was returned.')

  return data.temporaryPassword
}

function TemporaryPasswordPanel({
  title,
  description,
  password,
  onBack,
}: {
  title: string
  description: string
  password: string
  onBack?: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function copyPassword() {
    await navigator.clipboard.writeText(password)
    setCopied(true)
  }

  return (
    <div className="page-card temporary-password-card">
      <p className="eyebrow">{title}</p>
      <h1>Temporary password</h1>
      <p className="muted">{description}</p>
      <div className="temporary-password-value">{password}</div>
      <div className="form-actions">
        <button className="button primary" type="button" onClick={copyPassword}>
          {copied ? 'Copied' : 'Copy password'}
        </button>
        {onBack && (
          <button className="button secondary" type="button" onClick={onBack}>
            Back to users
          </button>
        )}
      </div>
    </div>
  )
}

function ResetPasswordSection({ tenantId, profileId }: { tenantId: string; profileId: string }) {
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resetPassword() {
    if (!window.confirm('Reset this user password? The old password will stop working.')) return

    setError(null)
    setIsResetting(true)

    try {
      setTemporaryPassword(await resetTenantUserPassword(tenantId, profileId))
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Could not reset password.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="page-card password-reset-card">
      <div>
        <p className="eyebrow">User access</p>
        <h2>Reset password</h2>
        <p className="muted">Generate a new temporary password for this user. It will only be shown once.</p>
      </div>

      {temporaryPassword ? (
        <TemporaryPasswordPanel
          title="Password reset"
          password={temporaryPassword}
          description="Share this temporary password with the user. It will only be shown now."
        />
      ) : (
        <button className="button secondary" type="button" disabled={isResetting} onClick={resetPassword}>
          {isResetting ? 'Resetting...' : 'Generate new temporary password'}
        </button>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  )
}

function isVisible(field: FieldConfig, values: Draft) {
  if (!field.showWhen) return true
  return values[field.showWhen.field] === field.showWhen.value
}

function applyCalculatedFields(resourceName: string, payload: Record<string, unknown>) {
  if (resourceName === 'research') {
    payload.amount = sumJsonAmounts(payload.research_funds)
  }

  if (resourceName === 'invention_disclosures') {
    payload.amount = sumJsonAmounts(payload.idf_funds)
  }
}

function validatePayload(resourceName: string, payload: Record<string, unknown>) {
  if (['trl_assessments', 'mrl_assessments', 'crl_assessments'].includes(resourceName)) {
    if (!payload.research_id && !payload.prior_art_search_id && !payload.ip_id) {
      throw new Error('You must link this assessment to at least one of Research, Prior Art Search, or IP before saving.')
    }
  }

  if (resourceName === 'consultations' && !payload.research_id && !payload.invention_disclosure_id) {
    throw new Error('This consultation must be linked to at least one of Research or Invention Disclosure before saving.')
  }

  if (resourceName === 'solutions' && !payload.consultation_id && (!Array.isArray(payload.associated_ip) || payload.associated_ip.length === 0)) {
    throw new Error('This solution must include at least one Consultation or Associated IP before saving.')
  }
}

function sumJsonAmounts(value: unknown) {
  if (!Array.isArray(value)) return 0
  return value.reduce((total, item) => {
    if (!item || typeof item !== 'object') return total
    const amount = Number((item as { amount?: unknown }).amount || 0)
    return Number.isFinite(amount) ? total + amount : total
  }, 0)
}

async function syncPivotTables(resourceName: string, recordId: number, tenantId: string, payload: Record<string, unknown>) {
  if (resourceName === 'entities') {
    await replaceEntityPivots(recordId, tenantId, payload)
    return
  }

  if (resourceName === 'research') {
    await replaceResearchPivots(recordId, tenantId, payload)
    return
  }

  if (resourceName === 'invention_disclosures') {
    await replaceIdfPivots(recordId, tenantId, payload)
    return
  }

  if (resourceName === 'licenses') {
    await replaceLicensePivots(recordId, tenantId, payload)
    return
  }

  if (resourceName === 'industry_common_challenges') {
    await replaceIndustryChallengePivots(recordId, tenantId, payload)
    return
  }

  const ipType = ipTypeForResource(resourceName)
  if (ipType) {
    await replaceIpPivots(ipType, recordId, tenantId, payload)
  }
}

async function replaceEntityPivots(entityId: number, tenantId: string, payload: Record<string, unknown>) {
  await checkedDelete('entity_industries', 'entity_id', entityId, tenantId)
  const industries = Array.isArray(payload.industries)
    ? payload.industries.map((industry) => ({ tenant_id: tenantId, entity_id: entityId, industry: String(industry) })).filter((row) => row.industry)
    : []
  await checkedInsert('entity_industries', industries)
}

async function replaceResearchPivots(researchId: number, tenantId: string, payload: Record<string, unknown>) {
  await checkedDelete('research_fund', 'research_id', researchId, tenantId)
  await checkedDelete('research_research_area', 'research_id', researchId, tenantId)
  await checkedDelete('research_team_member', 'research_id', researchId, tenantId)

  const funds = asRows(payload.research_funds)
    .map((row) => ({
      tenant_id: tenantId,
      research_id: researchId,
      fund_id: Number(row.fund_id),
      amount: Number(row.amount || 0),
    }))
    .filter((row) => row.fund_id)

  const areas = asNumbers(payload.research_area_ids).map((research_area_id) => ({
    tenant_id: tenantId,
    research_id: researchId,
    research_area_id,
  }))

  const team = [
    Number(payload.pi_user_id)
      ? {
          research_id: researchId,
          tenant_id: tenantId,
          user_id: Number(payload.pi_user_id),
          is_pi: true,
        }
      : null,
    ...asNumbers(payload.team_member_ids).map((user_id) => ({
      research_id: researchId,
      tenant_id: tenantId,
      user_id,
      is_pi: false,
    })),
  ].filter(Boolean)

  await checkedInsert('research_fund', funds)
  await checkedInsert('research_research_area', areas)
  await checkedInsert('research_team_member', team)
}

async function replaceIdfPivots(inventionDisclosureId: number, tenantId: string, payload: Record<string, unknown>) {
  await checkedDelete('idf_inventors', 'invention_disclosure_id', inventionDisclosureId, tenantId)
  await checkedDelete('idf_applicants', 'invention_disclosure_id', inventionDisclosureId, tenantId)
  await checkedDelete('idf_fund', 'invention_disclosure_id', inventionDisclosureId, tenantId)

  const inventors = asRows(payload.inventors)
    .map((row) => ({
      tenant_id: tenantId,
      invention_disclosure_id: inventionDisclosureId,
      user_id: Number(row.user_id),
      contribution_percentage: nullableNumber(row.contribution_percentage),
      contribution_description: row.contribution_description || null,
    }))
    .filter((row) => row.user_id)

  const applicants = asRows(payload.applicants)
    .map((row) => ({
      tenant_id: tenantId,
      invention_disclosure_id: inventionDisclosureId,
      user_applicant_id: nullableNumber(row.user_applicant_id),
      entity_applicant_id: nullableNumber(row.entity_applicant_id),
      ownership_percentage: Number(row.ownership_percentage || 0),
    }))
    .filter((row) => row.user_applicant_id || row.entity_applicant_id)

  const funds = asRows(payload.idf_funds)
    .map((row) => ({
      tenant_id: tenantId,
      invention_disclosure_id: inventionDisclosureId,
      fund_id: Number(row.fund_id),
      amount: Number(row.amount || 0),
    }))
    .filter((row) => row.fund_id)

  await checkedInsert('idf_inventors', inventors)
  await checkedInsert('idf_applicants', applicants)
  await checkedInsert('idf_fund', funds)
}

async function replaceIpPivots(ipType: string, ipId: number, tenantId: string, payload: Record<string, unknown>) {
  await supabaseClient.from('ip_inventors').delete().eq('tenant_id', tenantId).eq('ip_type', ipType).eq('ip_id', ipId).throwOnError()
  await supabaseClient.from('ip_applicants').delete().eq('tenant_id', tenantId).eq('ip_type', ipType).eq('ip_id', ipId).throwOnError()

  const inventors = asNumbers(payload.inventor_ids).map((user_id) => ({
    tenant_id: tenantId,
    ip_type: ipType,
    ip_id: ipId,
    user_id,
  }))

  const applicants = asRows(payload.applicants)
    .map((row) => ({
      tenant_id: tenantId,
      ip_type: ipType,
      ip_id: ipId,
      user_applicant_id: nullableNumber(row.user_applicant_id),
      entity_applicant_id: nullableNumber(row.entity_applicant_id),
      ownership_percentage: Number(row.ownership_percentage || 0),
    }))
    .filter((row) => row.user_applicant_id || row.entity_applicant_id)

  await checkedInsert('ip_inventors', inventors)
  await checkedInsert('ip_applicants', applicants)
}

async function replaceLicensePivots(licenseId: number, tenantId: string, payload: Record<string, unknown>) {
  await checkedDelete('license_licensors', 'license_id', licenseId, tenantId)
  await checkedDelete('license_milestones', 'license_id', licenseId, tenantId)

  const licensors = asRows(payload.licensors)
    .map((row) => ({
      tenant_id: tenantId,
      license_id: licenseId,
      user_licensor_id: nullableNumber(row.user_licensor_id),
      entity_licensor_id: nullableNumber(row.entity_licensor_id),
    }))
    .filter((row) => row.user_licensor_id || row.entity_licensor_id)

  const milestones = asRows(payload.milestones)
    .map((row) => ({
      tenant_id: tenantId,
      license_id: licenseId,
      description: String(row.description || '').trim(),
      amount: Number(row.amount || 0),
    }))
    .filter((row) => row.description)

  await checkedInsert('license_licensors', licensors)
  await checkedInsert('license_milestones', milestones)
}

async function replaceIndustryChallengePivots(challengeId: number, tenantId: string, payload: Record<string, unknown>) {
  await checkedDelete('industry_challenge_problem_statement', 'industry_common_challenge_id', challengeId, tenantId)
  const links = asNumbers(payload.linked_problem_statement_ids).map((industry_problem_statement_id) => ({
    tenant_id: tenantId,
    industry_common_challenge_id: challengeId,
    industry_problem_statement_id,
  }))
  await checkedInsert('industry_challenge_problem_statement', links)
}

async function checkedDelete(table: string, column: string, value: number, tenantId: string) {
  const { error } = await supabaseClient.from(table).delete().eq('tenant_id', tenantId).eq(column, value)
  if (error) throw error
}

async function checkedInsert(table: string, rows: unknown[]) {
  if (rows.length === 0) return
  const { error } = await supabaseClient.from(table).insert(rows)
  if (error) throw error
}

function asRows(value: unknown): RepeaterRow[] {
  return Array.isArray(value) ? (value.filter((item) => item && typeof item === 'object') as RepeaterRow[]) : []
}

function asNumbers(value: unknown) {
  return Array.isArray(value) ? value.map(Number).filter((item) => Number.isFinite(item) && item > 0) : []
}

function nullableNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null
}

function ipTypeForResource(resourceName: string) {
  const entries = Object.entries(ipResourceByType)
  return entries.find(([, resource]) => resource === resourceName)?.[0]
}

function FieldInput({
  field,
  value,
  selectedFile,
  onChange,
  onFileChange,
  values,
}: {
  field: FieldConfig
  value: DraftValue
  selectedFile: File | null
  values: Draft
  onChange: (value: DraftValue) => void
  onFileChange: (file: File | null) => void
}) {
  const commonProps = {
    id: field.name,
    name: field.name,
    required: field.required,
    disabled: field.readOnly,
  }

  return (
    <div
      className={
        [
          'textarea',
          'multi',
          'relation-multi',
          'ip-multi',
          'json',
          'fund-repeater',
          'inventor-repeater',
          'applicant-repeater',
          'licensor-repeater',
          'milestone-repeater',
        ].includes(field.type)
          ? 'field wide'
          : 'field'
      }
    >
      <span>
        {field.label}
        {field.required ? ' *' : ''}
      </span>

      {field.type === 'textarea' && (
        <textarea {...commonProps} value={String(value || '')} rows={4} onChange={(event) => onChange(event.target.value)} />
      )}

      {field.type === 'select' && (
        <select {...commonProps} value={String(value || '')} onChange={(event) => onChange(event.target.value)}>
          <option value="">None</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {field.type === 'relation' && (
        <RelationSelect field={field} value={value} commonProps={commonProps} onChange={onChange} />
      )}

      {field.type === 'relation-multi' && (
        <RelationMultiTagSelect field={field} value={value} onChange={onChange} />
      )}

      {field.type === 'ip-relation' && (
        <IpRelationSelect field={field} value={value} values={values} commonProps={commonProps} onChange={onChange} />
      )}

      {field.type === 'ip-multi' && (
        <IpMultiSelect field={field} value={value} values={values} onChange={onChange} />
      )}

      {field.type === 'fund-repeater' && <FundRepeater value={value} onChange={onChange} />}

      {field.type === 'inventor-repeater' && <InventorRepeater value={value} onChange={onChange} />}

      {field.type === 'applicant-repeater' && <ApplicantRepeater value={value} onChange={onChange} />}

      {field.type === 'licensor-repeater' && <LicensorRepeater value={value} onChange={onChange} />}

      {field.type === 'milestone-repeater' && <MilestoneRepeater value={value} onChange={onChange} />}

      {field.type === 'json' && (
        <textarea
          {...commonProps}
          className="code-input"
          rows={5}
          value={JSON.stringify(Array.isArray(value) ? value : [], null, 2)}
          onChange={(event) => {
            try {
              const parsed = JSON.parse(event.target.value)
              onChange(Array.isArray(parsed) ? parsed : [])
            } catch {
              onChange([])
            }
          }}
        />
      )}

      {field.type === 'multi' && (
        field.options?.length ? (
          <MultiTagSelect field={field} value={value} onChange={onChange} />
        ) : (
          <input
            {...commonProps}
            value={Array.isArray(value) ? value.join(', ') : ''}
            placeholder="Comma-separated values for now"
            onChange={(event) =>
              onChange(
                event.target.value
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
              )
            }
          />
        )
      )}

      {field.type === 'boolean' && (
        <input
          {...commonProps}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
      )}

      {field.type === 'file' && (
        <div className="file-field">
          <input
            {...commonProps}
            type="file"
            required={field.required && !value}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onFileChange(event.target.files?.[0] || null)}
          />
          {selectedFile && <small>File ready to upload.</small>}
          {!selectedFile && value && <small>Existing file uploaded.</small>}
        </div>
      )}

      {![
        'textarea',
        'select',
        'relation',
        'relation-multi',
        'ip-relation',
        'ip-multi',
        'json',
        'fund-repeater',
        'inventor-repeater',
        'applicant-repeater',
        'licensor-repeater',
        'milestone-repeater',
        'multi',
        'boolean',
        'file',
      ].includes(field.type) && (
        <input
          {...commonProps}
          type={field.inputType || field.type}
          value={String(value || '')}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  )
}

function FundRepeater({ value, onChange }: { value: DraftValue; onChange: (value: DraftValue) => void }) {
  const rows = asRows(value)
  const { result, query } = useList<RelationOption>({
    resource: 'funds',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false },
  })
  const funds = result?.data || []

  return (
    <div className="repeater">
      {rows.length === 0 && <p className="muted">No funds added yet.</p>}
      {rows.map((row, index) => (
        <div className="repeater-row" key={index}>
          <select
            value={String(row.fund_id || '')}
            onChange={(event) => updateRepeaterRow(rows, index, { fund_id: Number(event.target.value) || '' }, onChange)}
          >
            <option value="">{relationPlaceholder(query?.isLoading, Boolean(query?.error), funds.length)}</option>
            {funds.map((fund) => (
              <option key={fund.id} value={fund.id}>
                {relationLabel(fund)}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={String(row.amount || '')}
            onChange={(event) => updateRepeaterRow(rows, index, { amount: Number(event.target.value) || '' }, onChange)}
          />
          <button className="button secondary" type="button" onClick={() => removeRepeaterRow(rows, index, onChange)}>
            Remove
          </button>
        </div>
      ))}
      <button className="button secondary" type="button" onClick={() => onChange([...rows, { fund_id: '', amount: '' }])}>
        + Add Fund
      </button>
    </div>
  )
}

function InventorRepeater({ value, onChange }: { value: DraftValue; onChange: (value: DraftValue) => void }) {
  const rows = asRows(value)
  const { result, query } = useList<RelationOption>({
    resource: 'profiles',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false },
  })
  const users = result?.data || []

  return (
    <div className="repeater">
      {rows.length === 0 && <p className="muted">No inventors added yet.</p>}
      {rows.map((row, index) => (
        <div className="repeater-row" key={index}>
          <select
            value={String(row.user_id || '')}
            onChange={(event) => updateRepeaterRow(rows, index, { user_id: Number(event.target.value) || '' }, onChange)}
          >
            <option value="">{relationPlaceholder(query?.isLoading, Boolean(query?.error), users.length)}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {relationLabel(user)}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            max="100"
            placeholder="Contribution %"
            value={String(row.contribution_percentage || '')}
            onChange={(event) => updateRepeaterRow(rows, index, { contribution_percentage: Number(event.target.value) || '' }, onChange)}
          />
          <input
            placeholder="Contribution Description"
            value={String(row.contribution_description || '')}
            onChange={(event) => updateRepeaterRow(rows, index, { contribution_description: event.target.value }, onChange)}
          />
          <button className="button secondary" type="button" onClick={() => removeRepeaterRow(rows, index, onChange)}>
            Remove
          </button>
        </div>
      ))}
      <button className="button secondary" type="button" onClick={() => onChange([...rows, { user_id: '', contribution_percentage: '', contribution_description: '' }])}>
        + Add Inventor
      </button>
    </div>
  )
}

function ApplicantRepeater({ value, onChange }: { value: DraftValue; onChange: (value: DraftValue) => void }) {
  const rows = asRows(value)
  const { result: usersResult } = useList<RelationOption>({
    resource: 'profiles',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false },
  })
  const { result: entitiesResult } = useList<RelationOption>({
    resource: 'entities',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false },
  })
  const users = usersResult?.data || []
  const entities = entitiesResult?.data || []

  return (
    <div className="repeater">
      {rows.length === 0 && <p className="muted">No applicants added yet.</p>}
      {rows.map((row, index) => {
        const selectedParty = row.user_applicant_id
          ? `user:${row.user_applicant_id}`
          : row.entity_applicant_id
            ? `entity:${row.entity_applicant_id}`
            : ''

        return (
          <div className="repeater-row" key={index}>
            <select
              value={selectedParty}
              onChange={(event) => {
                const [kind, rawId] = event.target.value.split(':')
                updateRepeaterRow(
                  rows,
                  index,
                  {
                    user_applicant_id: kind === 'user' ? Number(rawId) : '',
                    entity_applicant_id: kind === 'entity' ? Number(rawId) : '',
                  },
                  onChange,
                )
              }}
            >
              <option value="">Select applicant</option>
              {users.map((user) => (
                <option key={`user:${user.id}`} value={`user:${user.id}`}>
                  User: {relationLabel(user)}
                </option>
              ))}
              {entities.map((entity) => (
                <option key={`entity:${entity.id}`} value={`entity:${entity.id}`}>
                  Entity: {relationLabel(entity)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Ownership %"
              value={String(row.ownership_percentage || '')}
              onChange={(event) => updateRepeaterRow(rows, index, { ownership_percentage: Number(event.target.value) || '' }, onChange)}
            />
            <button className="button secondary" type="button" onClick={() => removeRepeaterRow(rows, index, onChange)}>
              Remove
            </button>
          </div>
        )
      })}
      <button className="button secondary" type="button" onClick={() => onChange([...rows, { user_applicant_id: '', entity_applicant_id: '', ownership_percentage: '' }])}>
        + Add Applicant
      </button>
    </div>
  )
}

function LicensorRepeater({ value, onChange }: { value: DraftValue; onChange: (value: DraftValue) => void }) {
  const rows = asRows(value)
  const { result: usersResult } = useList<RelationOption>({
    resource: 'profiles',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false },
  })
  const { result: entitiesResult } = useList<RelationOption>({
    resource: 'entities',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false },
  })
  const users = usersResult?.data || []
  const entities = entitiesResult?.data || []

  return (
    <div className="repeater">
      {rows.length === 0 && <p className="muted">No licensors added yet.</p>}
      {rows.map((row, index) => {
        const selectedParty = row.user_licensor_id
          ? `user:${row.user_licensor_id}`
          : row.entity_licensor_id
            ? `entity:${row.entity_licensor_id}`
            : ''

        return (
          <div className="repeater-row compact" key={index}>
            <select
              value={selectedParty}
              onChange={(event) => {
                const [kind, rawId] = event.target.value.split(':')
                updateRepeaterRow(
                  rows,
                  index,
                  {
                    user_licensor_id: kind === 'user' ? Number(rawId) : '',
                    entity_licensor_id: kind === 'entity' ? Number(rawId) : '',
                  },
                  onChange,
                )
              }}
            >
              <option value="">Select licensor</option>
              {users.map((user) => (
                <option key={`user:${user.id}`} value={`user:${user.id}`}>
                  User: {relationLabel(user)}
                </option>
              ))}
              {entities.map((entity) => (
                <option key={`entity:${entity.id}`} value={`entity:${entity.id}`}>
                  Entity: {relationLabel(entity)}
                </option>
              ))}
            </select>
            <button className="button secondary" type="button" onClick={() => removeRepeaterRow(rows, index, onChange)}>
              Remove
            </button>
          </div>
        )
      })}
      <button className="button secondary" type="button" onClick={() => onChange([...rows, { user_licensor_id: '', entity_licensor_id: '' }])}>
        + Add Licensor
      </button>
    </div>
  )
}

function MilestoneRepeater({ value, onChange }: { value: DraftValue; onChange: (value: DraftValue) => void }) {
  const rows = asRows(value)

  return (
    <div className="repeater">
      {rows.length === 0 && <p className="muted">No milestones added yet.</p>}
      {rows.map((row, index) => (
        <div className="repeater-row" key={index}>
          <input
            placeholder="Description"
            value={String(row.description || '')}
            onChange={(event) => updateRepeaterRow(rows, index, { description: event.target.value }, onChange)}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Milestone Amount"
            value={String(row.amount || '')}
            onChange={(event) => updateRepeaterRow(rows, index, { amount: Number(event.target.value) || '' }, onChange)}
          />
          <button className="button secondary" type="button" onClick={() => removeRepeaterRow(rows, index, onChange)}>
            Remove
          </button>
        </div>
      ))}
      <button className="button secondary" type="button" onClick={() => onChange([...rows, { description: '', amount: '' }])}>
        + Add Milestone
      </button>
    </div>
  )
}

function updateRepeaterRow(rows: RepeaterRow[], index: number, patch: RepeaterRow, onChange: (value: DraftValue) => void) {
  onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))
}

function removeRepeaterRow(rows: RepeaterRow[], index: number, onChange: (value: DraftValue) => void) {
  onChange(rows.filter((_, rowIndex) => rowIndex !== index))
}

function RelationSelect({
  field,
  value,
  commonProps,
  onChange,
}: {
  field: FieldConfig
  value: DraftValue
  commonProps: { id: string; name: string; required?: boolean; disabled?: boolean }
  onChange: (value: DraftValue) => void
}) {
  if (field.resource === 'prior_art_searches') {
    return <PriorArtSearchSelect field={field} value={value} commonProps={commonProps} onChange={onChange} />
  }

  const { result, query } = useList<RelationOption>({
    resource: field.resource || '',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { enabled: Boolean(field.resource), retry: false },
  })
  const options = result?.data || []

  return (
    <select {...commonProps} value={String(value || '')} onChange={(event) => onChange(event.target.value)}>
      <option value="">{relationPlaceholder(query?.isLoading, Boolean(query?.error), options.length)}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {relationLabel(option)}
        </option>
      ))}
    </select>
  )
}

function PriorArtSearchSelect({
  field,
  value,
  commonProps,
  onChange,
}: {
  field: FieldConfig
  value: DraftValue
  commonProps: { id: string; name: string; required?: boolean; disabled?: boolean }
  onChange: (value: DraftValue) => void
}) {
  const { result, query } = useList<RelationOption>({
    resource: 'prior_art_searches',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false },
  })
  const { result: idfResult } = useList<RelationOption>({
    resource: 'invention_disclosures',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { retry: false },
  })
  const options = result?.data || []
  const idfById = new Map((idfResult?.data || []).map((idf) => [String(idf.id), relationLabel(idf)]))

  return (
    <select {...commonProps} value={String(value || '')} onChange={(event) => onChange(event.target.value)}>
      <option value="">{relationPlaceholder(query?.isLoading, Boolean(query?.error), options.length)}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {priorArtSearchLabel(option, idfById)}
        </option>
      ))}
    </select>
  )
}

function MultiTagSelect({
  field,
  value,
  onChange,
}: {
  field: FieldConfig
  value: DraftValue
  onChange: (value: DraftValue) => void
}) {
  const selected = Array.isArray(value) ? value.map(String) : []
  const options = (field.options || []).filter((option) => !selected.includes(option))

  return (
    <div className="tag-picker">
      <select
        value=""
        disabled={field.readOnly}
        onChange={(event) => {
          if (!event.target.value) return
          onChange([...selected, event.target.value])
        }}
      >
        <option value="">Add {field.label.toLowerCase()}...</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <div className="tag-list">
        {selected.length === 0 && <span className="muted">None selected.</span>}
        {selected.map((item) => (
          <span className="tag-chip" key={item}>
            {item}
            <button type="button" onClick={() => onChange(selected.filter((selectedItem) => selectedItem !== item))}>
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

function RelationMultiTagSelect({
  field,
  value,
  onChange,
}: {
  field: FieldConfig
  value: DraftValue
  onChange: (value: DraftValue) => void
}) {
  const selected = Array.isArray(value) ? value.map(Number).filter(Boolean) : []
  const { result, query } = useList<RelationOption>({
    resource: field.resource || '',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { enabled: Boolean(field.resource), retry: false },
  })
  const options = result?.data || []
  const selectedOptions = options.filter((option) => selected.includes(Number(option.id)))
  const availableOptions = options.filter((option) => !selected.includes(Number(option.id)))

  if (query?.isLoading) return <p className="muted">Loading {field.label.toLowerCase()}...</p>
  if (query?.error) return <p className="error">Could not load {field.label.toLowerCase()}.</p>
  if (options.length === 0) return <p className="muted">No related records found.</p>

  return (
    <div className="tag-picker">
      <select
        value=""
        disabled={field.readOnly}
        onChange={(event) => {
          const nextValue = Number(event.target.value)
          if (!nextValue) return
          onChange([...selected, nextValue])
        }}
      >
        <option value="">Add {field.label.toLowerCase()}...</option>
        {availableOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {relationLabel(option)}
          </option>
        ))}
      </select>
      <div className="tag-list">
        {selectedOptions.length === 0 && <span className="muted">None selected.</span>}
        {selectedOptions.map((option) => {
          const optionId = Number(option.id)
          return (
            <span className="tag-chip" key={option.id}>
              {relationLabel(option)}
              <button type="button" onClick={() => onChange(selected.filter((item) => item !== optionId))}>
                ×
              </button>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function IpRelationSelect({
  field,
  value,
  values,
  commonProps,
  onChange,
}: {
  field: FieldConfig
  value: DraftValue
  values: Draft
  commonProps: { id: string; name: string; required?: boolean; disabled?: boolean }
  onChange: (value: DraftValue) => void
}) {
  const ipType = String(values[field.dependsOn || 'ip_type'] || '')
  const resource = ipResourceByType[ipType as keyof typeof ipResourceByType]
  const { result, query } = useList<RelationOption>({
    resource: resource || 'patents',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { enabled: Boolean(resource), retry: false },
  })
  const options = result?.data || []

  if (!resource) {
    return (
      <select {...commonProps} value="" disabled>
        <option value="">Select IP Type first</option>
      </select>
    )
  }

  return (
    <select {...commonProps} value={String(value || '')} onChange={(event) => onChange(event.target.value)}>
      <option value="">{relationPlaceholder(query?.isLoading, Boolean(query?.error), options.length)}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {relationLabel(option)}
        </option>
      ))}
    </select>
  )
}

function IpMultiSelect({
  field,
  value,
  values,
  onChange,
}: {
  field: FieldConfig
  value: DraftValue
  values: Draft
  onChange: (value: DraftValue) => void
}) {
  const selected = Array.isArray(value) ? value.map(String) : []
  const ipType = String(values[field.dependsOn || 'ip_type'] || '')
  const resource = ipResourceByType[ipType as keyof typeof ipResourceByType]
  const { result, query } = useList<RelationOption>({
    resource: resource || 'patents',
    pagination: { mode: 'server', pageSize: 100 },
    queryOptions: { enabled: Boolean(resource), retry: false },
  })
  const options = result?.data || []

  if (!resource) return <p className="muted">Select IP Type first.</p>
  if (query?.isLoading) return <p className="muted">Loading IP records...</p>
  if (query?.error) return <p className="error">Could not load IP records.</p>
  if (!options.length) return <p className="muted">No IP records found for {ipType}.</p>

  return (
    <div className="tag-picker">
      <select
        value=""
        disabled={field.readOnly}
        onChange={(event) => {
          if (!event.target.value) return
          onChange([...selected, event.target.value])
        }}
      >
        <option value="">Add associated IP...</option>
        {options
          .filter((option) => !selected.includes(`${ipType}:${option.id}`))
          .map((option) => (
            <option key={option.id} value={`${ipType}:${option.id}`}>
              {relationLabel(option)}
            </option>
          ))}
      </select>
      <div className="tag-list">
        {selected.length === 0 && <span className="muted">None selected.</span>}
      {options.map((option) => {
        const encoded = `${ipType}:${option.id}`
        if (!selected.includes(encoded)) return null
        return (
          <span className="tag-chip" key={encoded}>
            {ipType}: {relationLabel(option)}
            <button type="button" onClick={() => onChange(selected.filter((item) => item !== encoded))}>
              ×
            </button>
          </span>
        )
      })}
      </div>
    </div>
  )
}

function relationPlaceholder(isLoading: boolean, hasError: boolean, optionCount: number) {
  if (isLoading) return 'Loading...'
  if (hasError) return 'Could not load options'
  if (optionCount === 0) return 'No records found'
  return 'None'
}

function relationLabel(option: RelationOption) {
  return String(option.name || option.title || option.email || option.id)
}

function priorArtSearchLabel(option: RelationOption, idfById: Map<string, string>) {
  const disclosureLabel = idfById.get(String(option.invention_disclosure_id || ''))
  if (disclosureLabel) return disclosureLabel
  return `Prior Art Search ${option.id}`
}
