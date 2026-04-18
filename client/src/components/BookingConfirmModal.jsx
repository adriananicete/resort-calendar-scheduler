import { ArrowLeft, Check } from 'lucide-react';
import { TOUR_LABELS, TOUR_COLORS, formatDateTime } from '../utils/tourTypeHelpers';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';

export default function BookingConfirmModal({ booking, checkOut, onConfirm, onCancel, submitting }) {
  if (!booking) return null;

  const tourColor = TOUR_COLORS[booking.tourType] || 'hsl(var(--border))';

  const Row = ({ label, value }) => (
    <div className="flex justify-between items-start py-2 border-b border-border/60 last:border-0 gap-4">
      <span className="text-sm text-muted-foreground font-medium flex-shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right">{value || '—'}</span>
    </div>
  );

  return (
    <Dialog open onOpenChange={(v) => !v && !submitting && onCancel()}>
      <DialogContent
        showClose={false}
        className="p-0 max-w-sm gap-0 overflow-hidden"
      >
        <div
          className="px-5 py-4 border-b border-border"
          style={{ borderTop: `4px solid ${tourColor}` }}
        >
          <DialogDescription className="text-muted-foreground text-xs font-medium">
            Review your booking
          </DialogDescription>
          <DialogTitle className="text-foreground font-semibold text-lg mt-0.5">
            Please double-check your details
          </DialogTitle>
        </div>

        <div className="px-5 py-3">
          <Row label="Name" value={booking.guestName} />
          <Row label="Contact" value={booking.contactNumber} />
          <Row label="Email" value={booking.email} />
          <Row label="Tour type" value={TOUR_LABELS[booking.tourType]} />
          <Row label="Room" value={booking.roomUnit} />
          <Row label="Check-in" value={formatDateTime(booking.checkIn)} />
          <Row label="Check-out" value={formatDateTime(checkOut)} />
          <Row
            label="Guests"
            value={`${booking.adults} adult${booking.adults !== 1 ? 's' : ''}${
              booking.children > 0
                ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}`
                : ''
            }`}
          />
          <Row label="Amount" value={`₱${Number(booking.amount).toLocaleString()}`} />
          <Row
            label="Payment"
            value={booking.paymentType === 'full' ? 'Full payment' : 'Downpayment'}
          />
          {booking.specialRequest && <Row label="Request" value={booking.specialRequest} />}
        </div>

        <div className="px-5 pb-5 pt-2 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1"
          >
            <ArrowLeft />
            Go back
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? (
              'Submitting...'
            ) : (
              <>
                <Check className="w-4 h-4" strokeWidth={3} />
                Confirm &amp; book
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
