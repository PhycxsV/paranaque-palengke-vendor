import { useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import {
  CheckCircle2,
  CreditCard,
  MapPin,
  Package,
  PackageCheck,
  Truck,
  User,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { DELIVERY_STATUS_LABELS } from '@/constants'
import {
  formatKeriRiderRemarks,
  normalizeDeliveryStatus,
  nextDeliveryActionLabel,
} from '@/lib/delivery'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { DeliveryMilestoneTracker } from '@/components/shared/DeliveryMilestoneTracker'
import { EmptyState } from '@/components/shared/EmptyState'
import { Notice } from '@/components/shared/Notice'
import { PortalHeader } from '@/components/shared/PortalHeader'
import { PaymentProofButton } from '@/components/shared/PaymentProofButton'
import { ProductImage } from '@/components/shared/ProductImage'
import { SectionCard } from '@/components/shared/SectionCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useSessionStore } from '@/stores/session-reset-store'
import { useOrderStore } from '@/stores/order-store'
import { formatPeso, formatDateTime } from '@/lib/utils'
import type { Order } from '@/types'

function Field({
  label,
  children,
  mono,
}: {
  label: string
  children: ReactNode
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd
        className={
          mono
            ? 'mt-0.5 break-all font-mono text-xs text-ink'
            : 'mt-0.5 text-sm font-semibold text-primary-deep'
        }
      >
        {children}
      </dd>
    </div>
  )
}

export default function VendorOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const activeVendorId = useSessionStore((s) => s.activeVendorId)
  const orders = useOrderStore((s) => s.orders)
  const confirmPayment = useOrderStore((s) => s.confirmPayment)
  const advanceDelivery = useOrderStore((s) => s.advanceDelivery)

  const [processing, setProcessing] = useState(false)

  const order = useMemo<Order | undefined>(
    () => orders.find((o) => o.id === orderId),
    [orders, orderId],
  )

  if (!order || order.vendorId !== activeVendorId) {
    const denied = Boolean(order)
    return (
      <div className="space-y-6">
        <PortalHeader
          title={denied ? 'Access denied' : 'Order not found'}
          back={{ to: '/vendor/orders', label: 'Back to orders' }}
        />
        <EmptyState
          icon={XCircle}
          title={denied ? 'Access denied' : 'Order not found'}
          description={
            denied
              ? 'This order belongs to a different vendor.'
              : `No order with ID "${orderId ?? ''}" was found.`
          }
        />
      </div>
    )
  }

  const canProcess = order.status === 'awaiting_vendor_confirmation'

  const handleConfirm = async () => {
    if (processing) return
    setProcessing(true)
    const result = await confirmPayment(order.id, activeVendorId)
    if (result.ok) {
      toast.success('Payment confirmed successfully')
    } else {
      toast.error(result.message)
    }
    setProcessing(false)
  }

  const handleAdvanceDelivery = async () => {
    if (processing) return
    setProcessing(true)
    const result = await advanceDelivery(order.id, activeVendorId)
    if (result.ok) {
      const label =
        DELIVERY_STATUS_LABELS[
          normalizeDeliveryStatus(result.order.deliveryStatus)
        ]
      if (result.order.pickupCode && result.order.deliveryStatus === 'ready_for_keri') {
        toast.success(`Ready for Keri — pickup PIN ${result.order.pickupCode}`)
      } else {
        toast.success(`Keri delivery updated: ${label}`)
      }
    } else {
      toast.error(result.message)
    }
    setProcessing(false)
  }

  const deliveryStatus = normalizeDeliveryStatus(order.deliveryStatus)
  const advanceLabel = nextDeliveryActionLabel(deliveryStatus)
  const canAdvanceDelivery =
    order.status === 'confirmed' && advanceLabel !== null

  const statusNotice = (() => {
    switch (order.status) {
      case 'awaiting_vendor_confirmation':
        return (
          <Notice tone="pending" title="Customer submitted payment">
            Check the proof of payment and transaction reference below, then confirm payment.
          </Notice>
        )
      case 'confirmed':
        return (
          <Notice tone="success" title="Payment confirmed">
            {deliveryStatus === 'delivered'
              ? 'Keri delivery is complete.'
              : deliveryStatus === 'packing'
                ? 'Pack the order, then mark it Ready for Keri. Delivery updates after that come from Keri.'
                : 'Waiting for Keri. Out for delivery and delivered are updated by Keri.'}
          </Notice>
        )
      case 'payment_rejected':
        return (
          <Notice tone="danger" title="Payment rejected">
            The customer may resubmit their payment details.
          </Notice>
        )
      case 'cancelled':
        return (
          <Notice
            tone="danger"
            title={
              order.cancelledBy === 'vendor'
                ? `Cancelled by ${order.vendorName}`
                : order.cancelledBy === 'system'
                  ? 'Expired — payment window timed out'
                  : 'Cancelled by customer'
            }
          >
            {order.cancelledBy === 'vendor'
              ? 'This order was cancelled while packing and its item stock was restored.'
              : order.cancelledBy === 'system'
                ? 'The customer did not submit payment within 10 minutes, so the stock reservation was released automatically.'
                : 'The customer cancelled this order before payment was confirmed.'}
          </Notice>
        )
      default:
        return (
          <Notice tone="info" title="Waiting for the customer">
            This order is not yet ready for vendor confirmation.
          </Notice>
        )
    }
  })()

  const beforeConfirm = order.status !== 'confirmed'
  const hasSidebar = canProcess || !beforeConfirm

  const customerCard = (
    <SectionCard title="Customer" icon={User}>
      <dl className="grid gap-4">
        <Field label="Name">{order.customerName}</Field>
        <Field label="Contact">{order.contactNumber}</Field>
        <Field label="Drop-off address">{order.deliveryAddress || '—'}</Field>
        {order.notes ? <Field label="Notes">{order.notes}</Field> : null}
        <Field label="Last updated">{formatDateTime(order.updatedAt)}</Field>
      </dl>
    </SectionCard>
  )

  const paymentCard = (
    <SectionCard title="Payment" icon={CreditCard}>
      <dl className="grid gap-4">
        <Field label="Transaction reference" mono>
          {order.transactionReference ?? '—'}
        </Field>
        {order.paymentSubmittedAt ? (
          <Field label="Submitted">
            {formatDateTime(order.paymentSubmittedAt)}
          </Field>
        ) : null}
        <Field label="Booking group" mono>
          {order.bookingGroupId}
        </Field>
      </dl>
      <div className="mt-5">
        <PaymentProofButton
          paymentProofUrl={order.paymentProofUrl}
          className="w-full"
        />
      </div>
    </SectionCard>
  )

  const pickupCard = (
    <SectionCard title="Keri pickup" icon={MapPin}>
      <dl className="grid gap-4">
        <Field label="Palengke">{order.branchName}</Field>
        <Field label="Coordinates" mono>
          {order.pickupLat.toFixed(5)}, {order.pickupLng.toFixed(5)}
        </Field>
        <Field label="Pickup PIN" mono>
          {order.pickupCode ?? 'Created at Ready for Keri'}
        </Field>
        <Field label="Rider remarks" mono>
          {order.pickupCode ? formatKeriRiderRemarks(order.pickupCode) : '—'}
        </Field>
        <Field label="Tracking ID" mono>
          {order.keriTrackingId ?? 'Assigned when dispatched'}
        </Field>
      </dl>
    </SectionCard>
  )

  return (
    <div className="space-y-6">
      <PortalHeader
        eyebrow="Order"
        title={order.id}
        description={`${order.customerName} · placed ${formatDateTime(order.createdAt)}`}
        back={{ to: '/vendor/orders', label: 'Back to orders' }}
        actions={<StatusBadge status={order.status} />}
      />

      {statusNotice}

      <div
        className={
          hasSidebar
            ? 'grid gap-6 lg:grid-cols-[1fr_340px]'
            : 'grid gap-6'
        }
      >
        <div className="space-y-6">
          {/* Items */}
          <SectionCard
            title={`Items (${order.items.length})`}
            icon={Package}
            bodyClassName="p-0 sm:p-0"
          >
            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li
                  key={item.productId}
                  className="flex items-center gap-4 px-5 py-4 sm:px-6"
                >
                  <ProductImage
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-14 w-14 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-primary-deep">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted">
                      {formatPeso(item.unitPrice)} / {item.unit} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-extrabold text-primary-deep">
                    {formatPeso(item.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-border bg-primary-50/40 px-5 py-4 text-sm sm:px-6">
              <div className="flex justify-between text-muted">
                <dt>Subtotal</dt>
                <dd>{formatPeso(order.subtotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-2">
                <dt className="font-bold text-primary-deep">Your total</dt>
                <dd className="font-display text-2xl font-extrabold text-primary">
                  {formatPeso(order.subtotal)}
                </dd>
              </div>
            </dl>
          </SectionCard>

          {beforeConfirm ? (
            <div className="grid items-stretch gap-6 md:grid-cols-3 [&>section]:h-full">
              {customerCard}
              {paymentCard}
              {pickupCard}
            </div>
          ) : null}

          {order.status === 'confirmed' ? (
            <SectionCard title="Keri delivery" icon={Truck}>
              <div className="space-y-5">
                <DeliveryMilestoneTracker
                  deliveryStatus={deliveryStatus}
                  podUrl={order.podUrl}
                />
                {order.pickupCode ? (
                  <div className="rounded-2xl border-2 border-primary/30 bg-primary-50/80 p-4 text-center sm:p-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary-deep">
                      Pickup PIN — verify with Keri rider
                    </p>
                    <p className="mt-2 font-display text-4xl font-extrabold tracking-[0.35em] text-primary-deep sm:text-5xl">
                      {order.pickupCode}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-muted">
                      Same code is in the rider’s remarks. Confirm it matches
                      before handing over the order.
                    </p>
                    <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-left text-[11px] text-muted ring-1 ring-border">
                      <span className="font-bold text-primary-deep">
                        Rider remarks:{' '}
                      </span>
                      <span className="font-mono text-ink">
                        {formatKeriRiderRemarks(order.pickupCode)}
                      </span>
                    </p>
                  </div>
                ) : deliveryStatus === 'packing' ? (
                  <p className="text-xs text-muted">
                    A 5-digit pickup PIN is created when you mark this order
                    Ready for Keri.
                  </p>
                ) : null}
                {canAdvanceDelivery && advanceLabel ? (
                  <Button onClick={handleAdvanceDelivery} disabled={processing}>
                    <PackageCheck className="h-4 w-4" />
                    {advanceLabel}
                  </Button>
                ) : null}
              </div>
            </SectionCard>
          ) : null}
        </div>

        {hasSidebar ? (
        <aside className="space-y-6">
          {canProcess ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-deep to-primary p-5 text-white shadow-[var(--shadow-lift)]">
              <span
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lime/25 blur-2xl"
                aria-hidden
              />
              <p className="relative text-lg font-extrabold">Review payment</p>
              <p className="relative mt-1 text-xs leading-relaxed text-white/75">
                All vendors in this booking group must receive payment before any
                vendor can confirm. Sibling orders share one Keri tracking ID once
                dispatched.
              </p>
              <div className="relative mt-4 grid gap-2.5">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="lime" size="lg" disabled={processing}>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm payment
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm payment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the order as confirmed. Keri delivery
                        starts only after every vendor in the same checkout has
                        confirmed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConfirm}>
                        Yes, confirm payment
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : null}

          {!beforeConfirm ? (
            <>
              {customerCard}
              {paymentCard}
              {pickupCard}
            </>
          ) : null}
        </aside>
        ) : null}
      </div>
    </div>
  )
}
