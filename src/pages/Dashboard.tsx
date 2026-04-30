import { BarChart3, Database } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabaseClient } from '../lib/supabaseClient'
import { useTenant } from '../providers/TenantProvider'

type DashboardKpis = {
  research_count: number
  patents_and_utility_models_count: number
  idf_count: number
  active_licenses: number
  consultation_count: number
  ip_assets_total: number
}

type ChartRow = {
  name: string
  [key: string]: string | number
}

export default function Dashboard() {
  const tenant = useTenant()
  const { data: kpis, loading: kpisLoading, error: kpisError } = useTenantView<DashboardKpis>('v_dashboard_kpis')

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>OTC Workbench Dashboard</h1>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Research Projects" value={kpis?.[0]?.research_count} loading={kpisLoading} />
        <KpiCard label="Patents & Utility Models" value={kpis?.[0]?.patents_and_utility_models_count} loading={kpisLoading} />
        <KpiCard label="Invention Disclosures" value={kpis?.[0]?.idf_count} loading={kpisLoading} />
        <KpiCard label="Active Licenses" value={kpis?.[0]?.active_licenses} loading={kpisLoading} />
        <KpiCard label="Consultations" value={kpis?.[0]?.consultation_count} loading={kpisLoading} />
        <KpiCard label="IP Assets (Total)" value={kpis?.[0]?.ip_assets_total} loading={kpisLoading} />
      </div>
      {kpisError && <p className="error">Could not load dashboard KPIs: {kpisError}</p>}

      <div className="dashboard-grid">
        <DashboardChart title="IP Portfolio Distribution" resource="v_ip_portfolio_distribution" dataKey="item_count" tenantId={tenant.id} />
        <DashboardChart title="Research Projects by Status" resource="v_research_projects_by_status" dataKey="project_count" tenantId={tenant.id} />
        <DashboardChart title="Research Funding by Status (EGP)" resource="v_research_funding_by_status" dataKey="total_egp" tenantId={tenant.id} />
        <DashboardChart title="Fund Pipeline by Status" resource="v_fund_pipeline_by_title" dataKey="item_count" tenantId={tenant.id} />
        <DashboardChart title="License Revenue (EGP)" resource="v_license_revenue_totals" dataKey="total_egp" tenantId={tenant.id} />
        <DashboardChart title="Consultation Fees by Status" resource="v_consultation_fees_by_status" dataKey="fees_total" tenantId={tenant.id} />
      </div>
    </section>
  )
}

function KpiCard({ label, value, loading }: { label: string; value?: number; loading?: boolean }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">
        <Database size={20} />
      </div>
      <span>{label}</span>
      <strong>{loading ? '...' : formatNumber(value ?? 0)}</strong>
    </div>
  )
}

function DashboardChart({
  title,
  resource,
  dataKey,
  tenantId,
}: {
  title: string
  resource: string
  dataKey: string
  tenantId: string
}) {
  const { data, loading, error } = useTenantView<ChartRow>(resource, tenantId)

  return (
    <div className="page-card">
      <div className="card-heading">
        <BarChart3 size={20} />
        <h2>{title}</h2>
      </div>
      {error && <p className="error">Could not load chart: {error}</p>}
      {!error && loading && <p className="muted">Loading chart...</p>}
      {!error && !loading && data.length === 0 && <p className="empty">No chart data yet.</p>}
      {!error && !loading && data.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => formatCompactNumber(Number(value))} />
            <Tooltip formatter={(value) => formatNumber(Number(value))} />
            <Bar dataKey={dataKey} fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function useTenantView<T extends Record<string, unknown>>(resource: string, tenantId?: string) {
  const tenant = useTenant()
  const activeTenantId = tenantId ?? tenant.id
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)

    async function loadRows() {
      const { data: rows, error: queryError } = await supabaseClient.from(resource).select('*').eq('tenant_id', activeTenantId)

      if (!isMounted) return

      if (queryError) {
        setError(queryError.message)
        setData([])
      } else {
        setData((rows ?? []) as T[])
      }

      setLoading(false)
    }

    void loadRows().catch((loadError) => {
      if (!isMounted) return
      setError(loadError instanceof Error ? loadError.message : 'Could not load dashboard data')
      setData([])
      setLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [resource, activeTenantId])

  return { data, loading, error }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(value)
}
