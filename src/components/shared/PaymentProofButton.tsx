import { ReceiptText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ZoomableImage } from '@/components/shared/ZoomableImage'
import { cn } from '@/lib/utils'

/** Opens the customer's proof-of-payment photo when `paymentProofUrl` is present. */
export function PaymentProofButton({
  paymentProofUrl,
  className,
  size = 'sm',
}: {
  paymentProofUrl?: string | null
  className?: string
  size?: 'sm' | 'default'
}) {
  const url = paymentProofUrl?.trim()
  if (!url) {
    return (
      <p className={cn('text-xs text-muted', className)}>
        No proof of payment photo was sent with this payment.
      </p>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          className={cn('gap-1.5', className)}
        >
          <ReceiptText className="h-3.5 w-3.5" />
          View proof of payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" mobileSheet>
        <DialogHeader>
          <DialogTitle>Proof of payment</DialogTitle>
          <DialogDescription>
            Photo the customer sent with their payment. Check it against the
            amount and reference before confirming.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ZoomableImage src={url} alt="Customer proof of payment" />
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block truncate text-center text-xs font-medium text-primary underline"
          >
            Open full image
          </a>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
