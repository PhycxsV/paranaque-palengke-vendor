import type { DeliveryStatus } from '@/types'

/** Canonical Keri delivery steps (after payment confirm). */
export const DELIVERY_FLOW: DeliveryStatus[] = [
  'packing',
  'ready_for_keri',
  'out_for_delivery',
  'delivered',
]

/**
 * Normalize persisted / legacy delivery status.
 * Older versions used `awaiting_pickup` (= packing).
 */
export function normalizeDeliveryStatus(
  status: string | undefined | null,
): DeliveryStatus {
  if (!status || status === 'awaiting_pickup') return 'packing'
  if (
    status === 'packing' ||
    status === 'ready_for_keri' ||
    status === 'out_for_delivery' ||
    status === 'delivered'
  ) {
    return status
  }
  return 'packing'
}

/**
 * Vendor-only advance action. After Ready for Keri, out_for_delivery /
 * delivered come from the Keri webhook — vendors cannot push those.
 */
export function nextDeliveryActionLabel(status: DeliveryStatus): string | null {
  if (status === 'packing') return 'Mark ready for Keri'
  return null
}

/** Random 5-digit PIN (10000–99999) for vendor ↔ rider pickup verification. */
export function generatePickupCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000))
}

/** Text for the Keri rider remarks field. */
export function formatKeriRiderRemarks(pickupCode: string): string {
  return `Pickup PIN ${pickupCode} — verify with vendor before taking the order.`
}
