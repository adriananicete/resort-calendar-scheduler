import { createPortal } from 'react-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { TOUR_LABELS, TOUR_COLORS, formatDateTime } from '../utils/tourTypeHelpers';

export default function BookingConfirmModal({ booking, checkOut, onConfirm, onCancel, submitting }) {
  if (!booking) return null;

  const tourColor = TOUR_COLORS[booking.tourType] || '#6B7280';

  const Row = ({ label, value }) => (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right">{value || '—'}</span>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4" style={{ backgroundColor: tourColor }}>
          <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">Review Your Booking</p>
          <h3 className="text-white font-bold text-xl mt-0.5">Please double-check your details</h3>
        </div>

        {/* Details */}
        <div className="px-5 py-3">
          <Row label="Name"        value={booking.guestName} />
          <Row label="Contact"     value={booking.contactNumber} />
          <Row label="Email"       value={booking.email} />
          <Row label="Tour Type"   value={TOUR_LABELS[booking.tourType]} />
          <Row label="Room"        value={booking.roomUnit} />
          <Row label="Check-in"    value={formatDateTime(booking.checkIn)} />
          <Row label="Check-out"   value={formatDateTime(checkOut)} />
          <Row label="Guests"      value={`${booking.adults} adult${booking.adults !== 1 ? 's' : ''}${booking.children > 0 ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''}`} />
          <Row label="Amount"      value={`₱${Number(booking.amount).toLocaleString()}`} />
          <Row label="Payment"     value={booking.paymentType === 'full' ? 'Full Payment' : 'Downpayment'} />
          {booking.specialRequest && (
            <Row label="Request"   value={booking.specialRequest} />
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-2 flex gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-70 flex items-center justify-center gap-1.5"
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
      </div>
    </div>,
    document.body
  );
}
