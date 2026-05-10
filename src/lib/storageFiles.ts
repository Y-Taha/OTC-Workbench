import { supabaseClient } from './supabaseClient'

export const bucketByField: Record<string, string> = {
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

export function bucketForFileField(fieldName: string) {
  return bucketByField[fieldName] || 'documents'
}

export function filePathValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function fileNameFromPath(path: string) {
  const cleanPath = path.split(/[?#]/)[0] || path
  const encodedName = cleanPath.split('/').filter(Boolean).pop() || cleanPath

  try {
    return stripGeneratedUuid(decodeURIComponent(encodedName))
  } catch {
    return stripGeneratedUuid(encodedName)
  }
}

function stripGeneratedUuid(fileName: string) {
  return fileName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-/i, '')
}

export async function fileViewUrl(fieldName: string, value: unknown) {
  const path = filePathValue(value)
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path

  const { data, error } = await supabaseClient.storage.from(bucketForFileField(fieldName)).createSignedUrl(path, 60 * 60)
  if (error) throw error

  return data.signedUrl
}
