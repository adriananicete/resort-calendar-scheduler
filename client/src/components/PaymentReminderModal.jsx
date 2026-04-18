import { Hourglass, CreditCard, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';

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
        className="p-0 max-w-sm gap-0 overflow-hidden"
      >
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
              <Hourglass className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <div>
              <DialogDescription className="text-muted-foreground text-xs font-medium">
                Booking reserved
              </DialogDescription>
              <DialogTitle className="text-foreground font-semibold text-lg mt-0.5 leading-tight">
                Complete your payment
              </DialogTitle>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-600 flex-shrink-0" strokeWidth={2} />
            <div>
              <p className="text-amber-900 font-semibold text-lg leading-none">30 minutes</p>
              <p className="text-amber-800 text-xs mt-1">to complete your payment</p>
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
              <span className="font-semibold text-destructive">30 minutes</span>. If payment is not
              received in time, your reservation will be{' '}
              <span className="font-semibold text-destructive">automatically cancelled</span> and the
              date will become available for other guests.
            </p>
          </div>
        </div>

        <div className="px-5 pb-5">
          <Button
            type="button"
            onClick={handleProceed}
            className="w-full"
          >
            <CreditCard className="w-4 h-4" strokeWidth={2.5} />
            Proceed to payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
