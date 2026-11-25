import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { FEATURE_TAWAD_ENABLED } from '@/constants'
import '@/stores/text-size-store'
import { useBackendSync } from '@/hooks/useBackendSync'
import { useIdleLogout } from '@/hooks/useIdleLogout'
import { RequireAuth } from '@/components/shared/RequireAuth'
import { VendorLayout } from '@/features/vendor/layouts/VendorLayout'
import AuthPage from '@/features/auth/AuthPage'
import VendorDashboardPage from '@/features/vendor/pages/VendorDashboardPage'
import VendorOrdersPage from '@/features/vendor/pages/VendorOrdersPage'
import VendorOrderDetailPage from '@/features/vendor/pages/VendorOrderDetailPage'
import VendorProductsPage from '@/features/vendor/pages/VendorProductsPage'
import VendorStoreProfilePage from '@/features/vendor/pages/VendorStorePage'
import VendorOffersPage from '@/features/vendor/pages/VendorOffersPage'
import VendorChatPage from '@/features/vendor/pages/VendorChatPage'
import VendorFeedbackPage from '@/features/vendor/pages/VendorFeedbackPage'
import NotFoundPage from '@/features/customer/pages/NotFoundPage'

function AppShell() {
  const { catalogReady, catalogError, apiConfigured } = useBackendSync()
  useIdleLogout()

  if (apiConfigured && !catalogReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-white text-sm text-muted-foreground">
        Connecting to Palengke API…
      </div>
    )
  }

  return (
    <>
      {catalogError ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
          Catalog warning: {catalogError}. Some listings may be empty until the API is available.
        </div>
      ) : null}
      <Routes>
        <Route path="login" element={<AuthPage portal="vendor" />} />
        <Route path="vendor/login" element={<AuthPage portal="vendor" />} />
        <Route path="auth" element={<Navigate to="/login" replace />} />

        <Route
          path="vendor"
          element={
            <RequireAuth roles={['vendor']}>
              <VendorLayout />
            </RequireAuth>
          }
        >
          <Route index element={<VendorDashboardPage />} />
          <Route path="orders" element={<VendorOrdersPage />} />
          <Route path="feedback" element={<VendorFeedbackPage />} />
          <Route path="orders/:orderId" element={<VendorOrderDetailPage />} />
          <Route path="products" element={<VendorProductsPage />} />
          <Route path="store" element={<VendorStoreProfilePage />} />
          <Route
            path="offers"
            element={
              FEATURE_TAWAD_ENABLED ? (
                <VendorOffersPage />
              ) : (
                <Navigate to="/vendor" replace />
              )
            }
          />
          <Route path="chat" element={<VendorChatPage />} />
          <Route path="chat/:threadId" element={<VendorChatPage />} />
        </Route>

        <Route index element={<Navigate to="/vendor" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster richColors position="top-center" closeButton />
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  )
}
