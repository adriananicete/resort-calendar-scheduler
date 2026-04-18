import { Hourglass, CreditCard, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

export default function PaymentReminderModal({ bookingId, paymentUrl, onClose }) {
  if (!paymentUrl) return null;

  function handleProceed() {
    window.location.href = paymentUrl;
  }

  return (
    <Dialog open>
      <DialogContent
        showClose={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="p-0 max-w-sm gap-0 overflow-hidden rounded-2xl sm:rounded-2xl"
      >
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Hourglass className="w-6 h-6 text-white" strokeWidth={2.25} />
            </div>
            <div>
              <DialogDescription className="text-white/80 text-[11px] font-semibold uppercase tracking-widest">
                Booking Reserved
              </DialogDescription>
              <DialogTitle className="text-white font-bold text-xl mt-0.5 leading-tight">
                Complete Your Payment
              </DialogTitle>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-600 flex-shrink-0" strokeWidth={2} />
            <div>
              <p className="text-amber-800 font-bold text-lg leading-none">30 minutes</p>
              <p className="text-amber-700 text-xs mt-1">to complete your payment</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Your booking{' '}
              <span className="font-semibold text-foreground font-mono">{bookingId}</span> has
              been reserved.
            </p>
            <p>
              Please complete the payment within{' '}
              <span className="font-semibold text-red-600">30 minutes</span>. If payment is not
              received in time, your reservation will be{' '}
              <span className="font-semibold text-red-600">automatically cancelled</span> and the
              date will become available for other guests.
            </p>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={handleProceed}
            className="w-full h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md transition flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" strokeWidth={2.5} />
            Proceed to Payment
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
