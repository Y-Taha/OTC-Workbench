import { useParams } from 'react-router-dom'
import ResourceDetail from '../components/ResourceDetail'
import ResourceForm from '../components/ResourceForm'
import ResourceList from '../components/ResourceList'
import { resourceByName, resourceByRoute } from '../data/resources'
import { NotFoundPage } from './ErrorPages'

function useResourceName() {
  const { resourceName = '' } = useParams()
  return resourceByRoute[resourceName]?.name || ''
}

export function ResourceListPage() {
  const resourceName = useResourceName()
  if (!resourceByName[resourceName]) return <NotFoundPage detail="The requested resource is not registered in this application." />
  return <ResourceList resourceName={resourceName} />
}

export function ResourceCreatePage() {
  const resourceName = useResourceName()
  if (!resourceByName[resourceName]) return <NotFoundPage detail="The requested resource is not registered in this application." />
  return <ResourceForm resourceName={resourceName} mode="create" />
}

export function ResourceEditPage() {
  const resourceName = useResourceName()
  if (!resourceByName[resourceName]) return <NotFoundPage detail="The requested resource is not registered in this application." />
  return <ResourceForm resourceName={resourceName} mode="edit" />
}

export function ResourceShowPage() {
  const resourceName = useResourceName()
  if (!resourceByName[resourceName]) return <NotFoundPage detail="The requested resource is not registered in this application." />
  return <ResourceDetail resourceName={resourceName} />
}
