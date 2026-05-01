import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { isSupabaseConfigured, supabaseClient } from '../lib/supabaseClient'
import { isPlatformAdminTenant } from '../lib/tenant'
import { useTenant } from '../providers/TenantProvider'

type NavItem = {
  label: string
  path?: string
  children?: { label: string; path: string }[]
}

const navItems: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Fund', path: '/funds' },
  {
    label: 'Research & Development',
    children: [
      { label: 'Research', path: '/research' },
      { label: 'Equipment', path: '/equipment' },
    ],
  },
  {
    label: 'Technology Management',
    children: [
      { label: 'IDF', path: '/idf' },
      { label: 'Prior Art Search', path: '/prior-art' },
      { label: 'TRL', path: '/trl' },
      { label: 'MRL', path: '/mrl' },
      { label: 'CRL', path: '/crl' },
    ],
  },
  {
    label: 'IP Protection',
    children: [
      { label: 'Patent', path: '/patents' },
      { label: 'Utility Model', path: '/utility-models' },
      { label: 'Design Right', path: '/design-rights' },
      { label: 'Plant Variety', path: '/plant-varieties' },
      { label: 'Circuit Design', path: '/circuit-designs' },
      { label: 'Copyrights', path: '/copyrights' },
      { label: 'Know How', path: '/know-how' },
    ],
  },
  {
    label: 'Technology Commercialization',
    children: [
      { label: 'License', path: '/licenses' },
      { label: 'License Revenues', path: '/license-revenues' },
      { label: 'Consultation', path: '/consultations' },
    ],
  },
  {
    label: 'Industry Collaboration',
    children: [
      { label: 'Industry Problem Statement', path: '/industry-problem-statements' },
      { label: 'Industry Common Challenge', path: '/industry-common-challenges' },
      { label: 'Solutions', path: '/solutions' },
    ],
  },
  { label: 'Users', path: '/users' },
  { label: 'Entities', path: '/entities' },
]

function NavGroup({ item }: { item: NavItem }) {
  const location = useLocation()
  const isChildActive = item.children?.some((child) => location.pathname === child.path)
  const [open, setOpen] = useState(Boolean(isChildActive))

  if (!item.children) return null

  return (
    <div>
      <button className="nav-group-button" type="button" onClick={() => setOpen((current) => !current)}>
        <span>{item.label}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {open && (
        <div className="nav-children">
          {item.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              className={({ isActive }) => (isActive ? 'nav-child-link active' : 'nav-child-link')}
              title={child.label}
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AppLayout() {
  const navigate = useNavigate()
  const tenant = useTenant()
  const [userName, setUserName] = useState('Signed in')
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'U'

  useEffect(() => {
    let isMounted = true

    async function loadUserName() {
      const { data } = await supabaseClient.auth.getUser()
      const user = data.user
      if (!user) return

      const authName = String(user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Signed in')
      const appUserQuery = supabaseClient.from('app_users').select('name, email').or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
      const { data: appUser } = await (isPlatformAdminTenant(tenant) ? appUserQuery : appUserQuery.eq('tenant_id', tenant.id)).maybeSingle()

      if (isMounted) setUserName(String(appUser?.name || authName))
    }

    void loadUserName()

    return () => {
      isMounted = false
    }
  }, [tenant.id])

  async function signOut() {
    await supabaseClient.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-mark" src="/nctc-logo.png" alt="NCTC logo" />
          <div>
            <strong>OTC Workbench</strong>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) =>
            item.children ? (
              <NavGroup key={item.label} item={item} />
            ) : (
              <NavLink
                key={item.path}
                to={item.path || '/'}
                end={item.path === '/'}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">{userInitial}</div>
          <span title={userName}>{userName}</span>
          <button className="sidebar-logout" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        {!isSupabaseConfigured && (
          <div className="setup-banner">
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to connect live data.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
