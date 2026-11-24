import { NavLink, useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  HandCoins,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  MessageSquareHeart,
  Package,
  Store,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  SidebarBackdrop,
  SidebarBrand,
} from '@/components/shared/PortalSidebarParts'
import { SIDEBAR_SURFACE, sidebarLinkClass } from '@/components/shared/sidebar-styles'
import { Button } from '@/components/ui/button'
import { FEATURE_TAWAD_ENABLED } from '@/constants'
import { getTotalUnread } from '@/lib/chat'
import { useAuthStore } from '@/stores/auth-store'
import { useChatStore } from '@/stores/chat-store'
import { useSessionStore } from '@/stores/session-reset-store'

const links = [
  { to: '/vendor', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/vendor/orders', label: 'Orders', icon: ClipboardList },
  { to: '/vendor/products', label: 'Products', icon: Package },
  { to: '/vendor/chat', label: 'Chat', icon: MessageCircle },
  { to: '/vendor/feedback', label: 'Feedback', icon: MessageSquareHeart },
  { to: '/vendor/offers', label: 'Offers', icon: HandCoins },
  { to: '/vendor/store', label: 'Store profile', icon: Store },
].filter((link) => FEATURE_TAWAD_ENABLED || link.to !== '/vendor/offers')

export function VendorSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const activeVendorId = useSessionStore((s) => s.activeVendorId)
  const chatThreads = useChatStore((s) => s.threads)
  const chatMessages = useChatStore((s) => s.messages)
  const chatUnread = getTotalUnread(
    chatThreads,
    chatMessages,
    'vendor',
    activeVendorId,
  )

  function handleSignOut() {
    onNavigate?.()
    logout()
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }

  return (
    <aside className={SIDEBAR_SURFACE}>
      <SidebarBackdrop />
      <SidebarBrand portalLabel="Vendor portal" />
      <nav className="relative flex-1 space-y-1 px-3 py-4">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) => sidebarLinkClass(isActive)}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {to === '/vendor/chat' && chatUnread > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-primary-deep">
                {chatUnread > 9 ? '9+' : chatUnread}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>
      <div className="relative space-y-2 border-t border-white/10 p-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2 text-white/80 hover:bg-white/10 hover:text-white"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
