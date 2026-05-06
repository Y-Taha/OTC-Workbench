import { useParams } from 'react-router-dom'
import ResourceDetail from '../components/ResourceDetail'
import ResourceForm from '../components/ResourceForm'
import ResourceList from '../components/ResourceList'
import { resourceByName, resourceByRoute } from '../data/resources'
import { useCanManageUsers } from '../hooks/useCanManageUsers'
import { ForbiddenPage, NotFoundPage } from './ErrorPages'

function useResourceName() {
  const { resourceName = '' } = useParams()
  return resourceByRoute[resourceName]?.name || ''
}

export function ResourceListPage() {
  const resourceName = useResourceName()
  const usersAccess = useUsersAccess(resourceName)
  if (!resourceByName[resourceName]) return <NotFoundPage detail="The requested resource is not registered in this application." />
  if (usersAccess.loading) return <div className="page-card">Checking access...</div>
  if (!usersAccess.allowed) return <ForbiddenPage message="Only tenant admins can manage users." />
  return <ResourceList resourceName={resourceName} />
}

export function ResourceCreatePage() {
  const resourceName = useResourceName()
  const usersAccess = useUsersAccess(resourceName)
  if (!resourceByName[resourceName]) return <NotFoundPage detail="The requested resource is not registered in this application." />
  if (usersAccess.loading) return <div className="page-card">Checking access...</div>
  if (!usersAccess.allowed) return <ForbiddenPage message="Only tenant admins can manage users." />
  return <ResourceForm resourceName={resourceName} mode="create" />
}

export function ResourceEditPage() {
  const resourceName = useResourceName()
  const usersAccess = useUsersAccess(resourceName)
  if (!resourceByName[resourceName]) return <NotFoundPage detail="The requested resource is not registered in this application." />
  if (usersAccess.loading) return <div className="page-card">Checking access...</div>
  if (!usersAccess.allowed) return <ForbiddenPage message="Only tenant admins can manage users." />
  return <ResourceForm resourceName={resourceName} mode="edit" />
}

export function ResourceShowPage() {
  const resourceName = useResourceName()
  const usersAccess = useUsersAccess(resourceName)
  if (!resourceByName[resourceName]) return <NotFoundPage detail="The requested resource is not registered in this application." />
  if (usersAccess.loading) return <div className="page-card">Checking access...</div>
  if (!usersAccess.allowed) return <ForbiddenPage message="Only tenant admins can manage users." />
  return <ResourceDetail resourceName={resourceName} />
}

function useUsersAccess(resourceName: string) {
  const { canManageUsers, loading } = useCanManageUsers()
  if (resourceName !== 'profiles') return { allowed: true, loading: false }
  return { allowed: canManageUsers, loading }
}
