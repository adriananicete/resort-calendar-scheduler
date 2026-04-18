import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getBookingStatus } from '../services/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

const MAX_POLLS = 20;
const POLL_INTERVAL = 3000; // 3 seconds

export default function BookingSuccess() {
  const { bookingId } = useParams();
  const [status, setStatus] = useState('polling'); // polling | confirmed | not_found | timeout
  const [guestName, setGuestName] = useState('');
  const pollCount = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    async function poll() {
      try {
        const data = await getBookingStatus(bookingId);

        if (data.status === 'confirmed') {
          setStatus('confirmed');
          setGuestName(data.guestName || '');
          clearInterval(intervalRef.current);
          return;
        }

        // Still pending — keep polling
        pollCount.current += 1;
        if (pollCount.current >= MAX_POLLS) {
          setStatus('timeout');
          clearInterval(intervalRef.current);
        }
      } catch (err) {
        // 404 = expired or not found
        if (err.response?.status === 404) {
          setStatus('not_found');
          clearInterval(intervalRef.current);
        }
      }
    }

    // Initial check
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);

    return () => clearInterval(intervalRef.current);
  }, [bookingId]);

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {status === 'polling' && (
          <>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-xl font-semibold text-foreground mt-6">Verifying Payment...</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Please wait while we confirm your payment. This may take a moment.
            </p>
            <p className="text-muted-foreground mt-4 text-xs">
              Booking ID: <span className="font-mono text-foreground">{bookingId}</span>
            </p>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 text-green-600" strokeWidth={2.25} />
            </div>
            <h2 className="text-xl font-semibold text-foreground mt-6">Booking Confirmed!</h2>
            {guestName && (
              <p className="text-muted-foreground mt-2">Thank you, {guestName}!</p>
            )}
            <p className="text-muted-foreground mt-2 text-sm">
              Your reservation has been confirmed. You will receive a confirmation at the email you provided.
            </p>
            <p className="text-muted-foreground mt-4 text-xs">
              Booking ID: <span className="font-mono text-foreground">{bookingId}</span>
            </p>
            <Button asChild className="mt-6">
              <Link to="/">Back to Calendar</Link>
            </Button>
          </>
        )}

        {status === 'not_found' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-9 h-9 text-red-600" strokeWidth={2.25} />
            </div>
            <h2 className="text-xl font-semibold text-foreground mt-6">Booking Expired</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              This booking was not confirmed in time and has expired. Please create a new booking.
            </p>
            <Button asChild className="mt-6">
              <Link to="/">Book Again</Link>
            </Button>
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-9 h-9 text-amber-600" strokeWidth={2.25} />
            </div>
            <h2 className="text-xl font-semibold text-foreground mt-6">Payment Not Yet Received</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              We haven't received your payment confirmation yet. If you completed the payment, please wait a few minutes and check back.
            </p>
            <p className="text-muted-foreground mt-4 text-xs">
              Booking ID: <span className="font-mono text-foreground">{bookingId}</span>
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  pollCount.current = 0;
                  setStatus('polling');
                  intervalRef.current = setInterval(async () => {
                    try {
                      const data = await getBookingStatus(bookingId);
                      if (data.status === 'confirmed') {
                        setStatus('confirmed');
                        setGuestName(data.guestName || '');
                        clearInterval(intervalRef.current);
                      } else {
                        pollCount.current += 1;
                        if (pollCount.current >= MAX_POLLS) {
                          setStatus('timeout');
                          clearInterval(intervalRef.current);
                        }
                      }
                    } catch {
                      setStatus('not_found');
                      clearInterval(intervalRef.current);
                    }
                  }, POLL_INTERVAL);
                }}
              >
                Retry
              </Button>
              <Button asChild>
                <Link to="/">Back to Calendar</Link>
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
