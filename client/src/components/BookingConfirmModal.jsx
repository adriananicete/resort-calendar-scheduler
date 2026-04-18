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

  const tourColor = TOUR_COLORS[booking.tourType] || '#6B7280';

  const Row = ({ label, value }) => (
    <div className="flex justify-between items-start py-2 border-b border-border/60 last:border-0 gap-4">
      <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-foreground font-medium text-right">{value || '—'}</span>
    </div>
  );

  return (
    <Dialog open onOpenChange={(v) => !v && !submitting && onCancel()}>
      <DialogContent
        showClose={false}
        className="p-0 max-w-sm gap-0 overflow-hidden rounded-2xl sm:rounded-2xl"
      >
        <div className="px-5 py-4" style={{ backgroundColor: tourColor }}>
          <DialogDescription className="text-white/80 text-xs font-semibold uppercase tracking-widest">
            Review Your Booking
          </DialogDescription>
          <DialogTitle className="text-white font-bold text-xl mt-0.5">
            Please double-check your details
          </DialogTitle>
        </div>

        <div className="px-5 py-3">
          <Row label="Name" value={booking.guestName} />
          <Row label="Contact" value={booking.contactNumber} />
          <Row label="Email" value={booking.email} />
          <Row label="Tour Type" value={TOUR_LABELS[booking.tourType]} />
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
            value={booking.paymentType === 'full' ? 'Full Payment' : 'Downpayment'}
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
            Go Back
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-70 disabled:pointer-events-none"
            style={{ backgroundColor: submitting ? '#9ca3af' : tourColor }}
          >
            {submitting ? (
              'Submitting...'
            ) : (
              <>
                <Check className="w-4 h-4" strokeWidth={3} />
                Confirm &amp; Book
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
