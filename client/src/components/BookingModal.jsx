import { useState } from 'react';
import toast from 'react-hot-toast';
import { TOUR_COLORS, TOUR_LABELS, formatDateTime } from '../utils/tourTypeHelpers';
import { deleteBooking } from '../services/api';

export default function BookingModal({ booking, onClose, onEdit }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!booking) return null;

  const tourColor = TOUR_COLORS[booking.tourType] || '#6B7280';

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      setDeleting(true);
      await deleteBooking(booking._id);
      toast.success('Booking deleted.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const Row = ({ icon, label, value }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-base w-5 text-center flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
        <p className="text-sm text-gray-800 font-medium mt-0.5 break-words">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in">
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ backgroundColor: tourColor }}
        >
          <div>
            <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">
              {TOUR_LABELS[booking.tourType]}
            </p>
            <h3 className="text-white font-bold text-xl mt-0.5">{booking.guestName}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none font-light transition"
          >
            ×
          </button>
        </div>

        {/* Details */}
        <div className="px-5 py-2">
          <Row icon="🏠" label="Room / Unit" value={booking.roomUnit} />
          <Row icon="📅" label="Check-in" value={formatDateTime(booking.checkIn)} />
          <Row icon="📅" label="Check-out" value={formatDateTime(booking.checkOut)} />
          <Row icon="📞" label="Contact" value={booking.contactNumber} />
          <Row icon="📧" label="Email" value={booking.email} />
          <Row
            icon="👥"
            label="Guests"
            value={`${booking.adults} adult${booking.adults !== 1 ? 's' : ''}${booking.children > 0 ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''}`}
          />
          <Row
            icon="💳"
            label="Payment"
            value={`₱${Number(booking.amount).toLocaleString()} — ${booking.paymentType === 'full' ? 'Full Payment' : 'Downpayment'}`}
          />
          {booking.specialRequest && (
            <Row icon="📝" label="Special Request" value={booking.specialRequest} />
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-2 flex gap-2">
          <button
            onClick={() => { onEdit(booking); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-sm hover:bg-indigo-100 transition"
          >
            ✏️ Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition
              ${confirmDelete
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
          >
            {deleting ? 'Deleting...' : confirmDelete ? '⚠️ Confirm Delete' : '🗑️ Delete'}
          </button>
        </div>

        {confirmDelete && (
          <div className="px-5 pb-4">
            <button
              onClick={() => setConfirmDelete(false)}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
