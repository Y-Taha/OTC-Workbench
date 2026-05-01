import { Refine } from '@refinedev/core'
import routerProvider, { DocumentTitleHandler, UnsavedChangesNotifier } from '@refinedev/react-router'
import { liveProvider } from '@refinedev/supabase'
import { useMemo } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import { refineResources } from './data/resources'
import { createTenantDataProvider } from './lib/tenant'
import Dashboard from './pages/Dashboard'
import { NotFoundPage } from './pages/ErrorPages'
import LoginPage from './pages/LoginPage'
import { ResourceCreatePage, ResourceEditPage, ResourceListPage, ResourceShowPage } from './pages/ResourcePage'
import { supabaseClient } from './lib/supabaseClient'
import { authProvider } from './providers/authProvider'
import { AuthGate } from './providers/AuthGate'
import { TenantProvider, useTenant } from './providers/TenantProvider'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <AuthGate>
              <TenantProvider>
                <TenantScopedRefine />
              </TenantProvider>
            </AuthGate>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

function TenantScopedRefine() {
  const tenant = useTenant()
  const tenantDataProvider = useMemo(() => ({ default: createTenantDataProvider(tenant) }), [tenant])

  return (
    <Refine
      routerProvider={routerProvider}
      dataProvider={tenantDataProvider}
      liveProvider={liveProvider(supabaseClient)}
      authProvider={authProvider}
      resources={refineResources}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
        projectId: 'otc-workbench-supabase-refine',
      }}
    >
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path=":resourceName" element={<ResourceListPage />} />
          <Route path=":resourceName/create" element={<ResourceCreatePage />} />
          <Route path=":resourceName/edit/:id" element={<ResourceEditPage />} />
          <Route path=":resourceName/show/:id" element={<ResourceShowPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <UnsavedChangesNotifier />
      <DocumentTitleHandler />
    </Refine>
  )
}
