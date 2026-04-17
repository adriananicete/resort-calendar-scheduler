import { createPortal } from 'react-dom';

export default function PaymentReminderModal({ bookingId, paymentUrl, onClose }) {
  if (!paymentUrl) return null;

  function handleProceed() {
    window.location.href = paymentUrl;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">Booking Reserved</p>
              <h3 className="text-white font-bold text-xl mt-0.5">Complete Your Payment</h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Timer Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-amber-800 font-bold text-lg">30 minutes</p>
            <p className="text-amber-700 text-sm mt-1">
              to complete your payment
            </p>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <p>
              Your booking <span className="font-semibold text-gray-800">{bookingId}</span> has been reserved.
            </p>
            <p>
              Please complete the payment within <span className="font-semibold text-red-600">30 minutes</span>.
              If payment is not received in time, your reservation will be <span className="font-semibold text-red-600">automatically cancelled</span> and
              the date will become available for other guests.
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="px-5 pb-5">
          <button
            onClick={handleProceed}
            className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md transition"
          >
            Proceed to Payment →
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
