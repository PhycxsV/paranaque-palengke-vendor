import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  fetchBranches,
  fetchChatMessages,
  fetchChatThreads,
  fetchCommodities,
  fetchOrders,
  fetchPriceHistory,
  fetchProducts,
  fetchVendors,
  isApiConfigured,
} from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useBranchStore } from '@/stores/branch-store'
import { useChatStore } from '@/stores/chat-store'
import { useCommodityStore } from '@/stores/commodity-store'
import { hydrateCustomerProfile } from '@/stores/customer-profile-store'
import { useSessionStore } from '@/stores/session-reset-store'
import { useOrderStore } from '@/stores/order-store'
import { useProductStore } from '@/stores/product-store'
import { useVendorStore } from '@/stores/vendor-store'
import { useVendorUserStore } from '@/stores/vendor-user-store'

export function useBackendSync() {
  const restoreSession = useAuthStore((s) => s.restoreSession)
  const user = useAuthStore((s) => s.user)
  const jwt = useAuthStore((s) => s.jwt)
  const [catalogReady, setCatalogReady] = useState(!isApiConfigured())
  const [catalogError, setCatalogError] = useState<string | null>(null)

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  useEffect(() => {
    if (!isApiConfigured()) {
      setCatalogReady(true)
      return
    }

    let cancelled = false

    async function loadCatalog() {
      setCatalogReady(false)
      setCatalogError(null)
      try {
        const [branches, commodities, vendorBundle, products] = await Promise.all([
          fetchBranches(),
          fetchCommodities(),
          fetchVendors(),
          fetchProducts(),
        ])
        if (cancelled) return

        useBranchStore.setState({ branches })
        useCommodityStore.setState({ commodities })
        useVendorStore.setState({ vendors: vendorBundle.vendors })
        useVendorUserStore.setState((state) => {
          const byId = new Map(state.users.map((u) => [u.id, u]))
          for (const owner of vendorBundle.owners) {
            byId.set(owner.id, { ...byId.get(owner.id), ...owner, password: '' })
          }
          return { users: [...byId.values()] }
        })
        useProductStore.setState({ products })

        const session = useSessionStore.getState()
        if (
          !vendorBundle.vendors.some((v) => v.id === session.activeVendorId) &&
          vendorBundle.vendors[0]
        ) {
          useSessionStore.setState({
            activeVendorId: vendorBundle.vendors[0].id,
          })
        }

        setCatalogReady(true)
      } catch (error) {
        if (cancelled) return
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load catalog from the API.'
        setCatalogError(message)
        setCatalogReady(true)
        toast.error(`Backend: ${message}`)
      }
    }

    void loadCatalog()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isApiConfigured() || !jwt || !user) {
      if (isApiConfigured() && !jwt) {
        useOrderStore.setState({ orders: [] })
        useChatStore.setState({ threads: [], messages: [] })
      }
      return
    }

    let cancelled = false

    async function loadPrivate() {
      // Lock the vendor workspace before fetching so list pages filter correctly
      // as soon as orders arrive (no refresh needed).
      if (user!.role === 'vendor') {
        const ownedIds =
          user!.ownedVendorIds?.length > 0
            ? user!.ownedVendorIds
            : useVendorStore
                .getState()
                .vendors.filter((v) => v.ownerUserId === user!.id)
                .map((v) => v.id)

        if (ownedIds.length > 0) {
          useVendorStore.setState((state) => ({
            vendors: state.vendors.map((v) =>
              ownedIds.includes(v.id)
                ? { ...v, ownerUserId: user!.id }
                : v,
            ),
          }))
          useSessionStore.setState({ activeVendorId: ownedIds[0] })
        }
      }

      try {
        const orders = await fetchOrders()
        if (cancelled) return
        useOrderStore.setState({ orders })

        if (
          user!.role === 'vendor' &&
          !(user!.ownedVendorIds?.length > 0) &&
          orders[0]?.vendorId
        ) {
          useSessionStore.setState({ activeVendorId: orders[0].vendorId })
        }
      } catch {
        // Orders endpoint may be restricted for this role.
      }

      try {
        if (user!.role === 'lgu-admin') {
          const history = await fetchPriceHistory()
          if (!cancelled) {
            useCommodityStore.setState({ priceHistory: history })
          }
        }
      } catch {
        // Price history is LGU-only.
      }

      if (user!.role === 'customer') {
        // Restores saved drop-off details after a session restore or sign-in.
        await hydrateCustomerProfile()
      }

      try {
        if (user!.role === 'customer' || user!.role === 'vendor') {
          const [threads, messages] = await Promise.all([
            fetchChatThreads(),
            fetchChatMessages(),
          ])
          if (!cancelled) {
            useChatStore.setState({ threads, messages })
          }
        }
      } catch {
        // Chat may be unavailable for this session.
      }
    }

    void loadPrivate()
    return () => {
      cancelled = true
    }
  }, [jwt, user])

  return { catalogReady, catalogError, apiConfigured: isApiConfigured() }
}
