import { useState, useRef, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import BookingForm from './components/BookingForm';
import CalendarView from './components/CalendarView';
import { useBookings } from './hooks/useBookings';

const MOBILE_QUERY = '(max-width: 1023px)';
const isMobileViewport = () =>
  typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;

export default function App() {
  const { bookings, loading } = useBookings();
  const [editingBooking, setEditingBooking] = useState(null);
  const [initialDate, setInitialDate]       = useState(null);
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

  // Measure form height so calendar can match it (desktop only)
  const formRef = useRef(null);
  const [formHeight, setFormHeight] = useState(null);

  useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      // Only meaningful on desktop where form sits beside calendar
      if (!isMobileViewport()) setFormHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Lock body scroll while mobile form modal is open
  useEffect(() => {
    if (!isMobileFormOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isMobileFormOpen]);

  const justOpenedRef = useRef(0);

  function handleCalendarSlotClick(date) {
    setEditingBooking(null);
    setInitialDate(date);
    if (isMobileViewport()) {
      justOpenedRef.current = Date.now();
      setIsMobileFormOpen(true);
    } else {
      document.getElementById('booking-form-panel')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function handleBackdropClick(e) {
    if (!isMobileFormOpen) return;
    if (e.target !== e.currentTarget) return;
    if (Date.now() - justOpenedRef.current < 400) return;
    setIsMobileFormOpen(false);
  }

  function handleNewBookingClick() {
    setEditingBooking(null);
    setInitialDate(null);
    justOpenedRef.current = Date.now();
    setIsMobileFormOpen(true);
  }

  function handleEditDone() {
    setEditingBooking(null);
    setInitialDate(null);
    setIsMobileFormOpen(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontSize: '14px', borderRadius: '10px' },
          success: { iconTheme: { primary: '#6366F1', secondary: '#fff' } },
        }}
      />

      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow">
              🌴
            </div>
            <div>
              <h1 className="text-gray-900 font-bold text-lg leading-tight">Resort Booking Scheduler</h1>
              <p className="text-gray-400 text-xs">Manage reservations in real-time</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>Live sync active</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-4 py-5 flex flex-col lg:flex-row gap-5 lg:items-start">
        {/* Left Panel — Booking Form (inline on desktop, modal on mobile) */}
        <div
          id="booking-form-panel"
          onClick={handleBackdropClick}
          className={`
            ${isMobileFormOpen
              ? 'fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto'
              : 'hidden'}
            lg:block lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:backdrop-blur-none lg:p-0 lg:overflow-visible
            lg:w-2/5 xl:w-[38%] lg:flex-shrink-0 lg:sticky lg:top-5
          `}
        >
          <div
            ref={formRef}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md mx-auto lg:max-w-none lg:mx-0"
          >
            {isMobileFormOpen && (
              <button
                type="button"
                onClick={() => setIsMobileFormOpen(false)}
                aria-label="Close form"
                className="lg:hidden absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 text-xl font-bold hover:bg-gray-50"
              >
                ×
              </button>
            )}
            <BookingForm
              editingBooking={editingBooking}
              onEditDone={handleEditDone}
              initialDate={initialDate}
              bookings={bookings}
            />
          </div>
        </div>

        {/* Right Panel — Calendar */}
        <div className="w-full lg:flex-1">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-md flex items-center justify-center" style={{ height: formHeight || 400 }}>
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-gray-400 text-sm mt-3">Loading calendar...</p>
              </div>
            </div>
          ) : (
            <CalendarView
              bookings={bookings}
              onSelectSlot={handleCalendarSlotClick}
              onNewBooking={handleNewBookingClick}
              formHeight={formHeight}
            />
          )}
        </div>
      </main>
    </div>
  );
}
