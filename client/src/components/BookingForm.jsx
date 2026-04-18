import { useState, useEffect, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { isSameDay } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import toast from 'react-hot-toast';
import { ClipboardList, Pencil, AlertTriangle } from 'lucide-react';
import {
  ROOM_UNITS,
  TOUR_LABELS,
  TOUR_COLORS,
  calculateCheckIn,
  calculateCheckOut,
  formatDateTime,
  getRoomPrice,
  formatPeso,
} from '../utils/tourTypeHelpers';
import { createBooking, updateBooking } from '../services/api';
import { useConflictCheck } from '../hooks/useConflictCheck';
import BookingConfirmModal from './BookingConfirmModal';
import PaymentReminderModal from './PaymentReminderModal';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from './ui/select';
import { cn } from '@/lib/utils';

function splitGuestName(fullName) {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return { first_name: '', last_name: '' };
  const firstSpace = trimmed.indexOf(' ');
  if (firstSpace === -1) return { first_name: trimmed, last_name: '' };
  return {
    first_name: trimmed.slice(0, firstSpace),
    last_name: trimmed.slice(firstSpace + 1).trim(),
  };
}

const EMPTY_FORM = {
  guestName: '',
  contactNumber: '',
  email: '',
  tourType: 'day',
  checkIn: null,
  roomUnit: '',
  adults: 1,
  children: 0,
  amount: '',
  paymentType: 'downpayment',
  specialRequest: '',
};

export default function BookingForm({ editingBooking, onEditDone, initialDate, bookings = [], activeTourType, onTourTypeChange }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [checkOut, setCheckOut] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null); // { bookingId, paymentUrl }

  const isEditing = !!editingBooking;

  // Pre-fill from edit or calendar slot click
  useEffect(() => {
    if (editingBooking) {
      setForm({
        guestName:      editingBooking.guestName,
        contactNumber:  editingBooking.contactNumber,
        email:          editingBooking.email,
        tourType:       editingBooking.tourType,
        checkIn:        new Date(editingBooking.checkIn),
        roomUnit:       editingBooking.roomUnit,
        adults:         editingBooking.adults,
        children:       editingBooking.children,
        amount:         editingBooking.amount,
        paymentType:    editingBooking.paymentType,
        specialRequest: editingBooking.specialRequest || '',
      });
      setCheckOut(new Date(editingBooking.checkOut));
    } else if (initialDate) {
      setForm((prev) => ({ ...prev, checkIn: new Date(initialDate) }));
    }
  }, [editingBooking, initialDate]);

  // Sync form tour type when calendar tab changes
  useEffect(() => {
    if (activeTourType && activeTourType !== form.tourType) {
      setForm((prev) => ({ ...prev, tourType: activeTourType }));
    }
  }, [activeTourType]);

  // Derived actual check-in time (8am day, 7pm night/overnight) — DatePicker gives midnight
  const actualCheckIn = useMemo(
    () => calculateCheckIn(form.checkIn, form.tourType),
    [form.checkIn, form.tourType],
  );

  // Recalculate checkout when checkIn or tourType changes
  useEffect(() => {
    if (form.checkIn && form.tourType) {
      setCheckOut(calculateCheckOut(form.checkIn, form.tourType));
    } else {
      setCheckOut(null);
    }
  }, [form.checkIn, form.tourType]);

  // Auto-fill amount based on selected room + payment type
  useEffect(() => {
    if (!form.roomUnit) {
      setForm((prev) => (prev.amount === '' ? prev : { ...prev, amount: '' }));
      return;
    }
    const price = getRoomPrice(form.roomUnit);
    const computed = form.paymentType === 'full' ? price : price * 0.5;
    setForm((prev) => (prev.amount === computed ? prev : { ...prev, amount: computed }));
  }, [form.roomUnit, form.paymentType]);

  // Dates that already have bookings for the selected tour type + room
  // Used to show strikethrough in the date picker
  const bookedDates = useMemo(() => {
    return bookings
      .filter((b) => {
        if (b.tourType !== form.tourType) return false;
        if (form.roomUnit && b.roomUnit !== form.roomUnit) return false;
        if (editingBooking && b._id === editingBooking._id) return false;
        return true;
      })
      .map((b) => new Date(b.checkIn));
  }, [bookings, form.tourType, form.roomUnit, editingBooking]);

  const { hasConflict, conflicts, checking } = useConflictCheck({
    roomUnit:  form.roomUnit,
    checkIn:   actualCheckIn,
    checkOut,
    excludeId: editingBooking?._id,
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Sync tour type selection to calendar tabs
    if (name === 'tourType' && onTourTypeChange) {
      onTourTypeChange(value);
    }
  }

  function handleNumberChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setCheckOut(null);
    setShowConfirm(false);
    if (onEditDone) onEditDone();
  }

  // Step 1: validate → show confirm modal
  function handleSubmit(e) {
    e.preventDefault();
    if (hasConflict) {
      toast.error('Cannot submit — this room is already booked on the selected date!');
      return;
    }
    if (!form.checkIn || !checkOut) {
      toast.error('Please select a check-in date.');
      return;
    }
    setShowConfirm(true);
  }

  // Step 2: user confirmed → actual API call
  async function handleConfirm() {
    const payload = {
      ...form,
      checkIn:  actualCheckIn.toISOString(),
      checkOut: checkOut.toISOString(),
    };

    try {
      setSubmitting(true);
      if (isEditing) {
        await updateBooking(editingBooking._id, payload);
        toast.success('Booking updated!');
        resetForm();
      } else {
        const saved = await createBooking(payload);

        // Build GHL payment URL
        const ghlUrl = import.meta.env.VITE_GHL_PAYMENT_URL;
        if (ghlUrl) {
          const { first_name, last_name } = splitGuestName(form.guestName);
          const params = new URLSearchParams({
            first_name,
            last_name,
            email: form.email,
            phone: form.contactNumber,
            amount: String(form.amount),
            bookingId: saved.bookingId,
          });
          const fullUrl = `${ghlUrl}?${params.toString()}`;

          // Show payment reminder modal instead of redirecting immediately
          setShowConfirm(false);
          setPaymentInfo({ bookingId: saved.bookingId, paymentUrl: fullUrl });
          return; // Don't reset — user still needs to proceed to payment
        }

        // Fallback if GHL URL not configured (dev mode)
        toast.success('Booking created! (Payment URL not configured)');
        resetForm();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong.';
      toast.error(msg);
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="px-5 py-4 border-b border-border space-y-1">
          <CardTitle className="text-lg flex items-center gap-2.5">
            {isEditing
              ? <Pencil className="w-5 h-5 text-muted-foreground" strokeWidth={2.25} />
              : <ClipboardList className="w-5 h-5 text-muted-foreground" strokeWidth={2.25} />}
            {isEditing ? 'Edit booking' : 'New booking'}
          </CardTitle>
          <CardDescription>
            {isEditing ? 'Update reservation details below' : 'Fill in the reservation details below'}
          </CardDescription>
        </CardHeader>

        {/* Conflict warning — no guest names for privacy */}
        {hasConflict && (
          <div className="px-5 pt-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>This date is already booked</AlertTitle>
              <AlertDescription>
                {conflicts.map((c, i) => (
                  <p key={i}>{c.roomUnit} is not available on the selected date and time.</p>
                ))}
                <p className="mt-1 opacity-80">Please choose a different date or room.</p>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Guest info */}
          <div className="space-y-1.5">
            <Label htmlFor="guestName">Full name *</Label>
            <Input
              id="guestName"
              name="guestName"
              value={form.guestName}
              onChange={handleChange}
              required
              placeholder="Juan Dela Cruz"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contactNumber">Contact no. *</Label>
              <Input
                id="contactNumber"
                name="contactNumber"
                value={form.contactNumber}
                onChange={handleChange}
                required
                placeholder="09XXXXXXXXX"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Tour type */}
          <div className="space-y-1.5">
            <Label>Tour type *</Label>
            <RadioGroup
              value={form.tourType}
              onValueChange={(v) => {
                handleChange({ target: { name: 'tourType', value: v } });
              }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2"
            >
              {Object.entries(TOUR_LABELS).map(([key, label]) => {
                const selected = form.tourType === key;
                return (
                  <Label
                    key={key}
                    htmlFor={`tour-${key}`}
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition text-xs font-medium',
                      selected
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent/50',
                    )}
                    style={
                      selected
                        ? { borderLeft: `4px solid ${TOUR_COLORS[key]}` }
                        : undefined
                    }
                  >
                    <RadioGroupItem value={key} id={`tour-${key}`} className="sr-only" />
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: selected ? TOUR_COLORS[key] : 'transparent',
                        border: selected ? 'none' : '2px solid hsl(var(--border))',
                      }}
                    />
                    {label}
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="checkIn">Check-in date *</Label>
              <DatePicker
                id="checkIn"
                selected={form.checkIn}
                onChange={(date) => setForm((prev) => ({ ...prev, checkIn: date }))}
                dateFormat="MMM d, yyyy"
                placeholderText="Select date"
                minDate={new Date()}
                customInput={<Input />}
                wrapperClassName="w-full"
                required
                dayClassName={(date) =>
                  bookedDates.some((d) => isSameDay(d, date))
                    ? 'date-already-booked'
                    : undefined
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Check-out date</Label>
              <Input
                readOnly
                disabled
                value={checkOut ? formatDateTime(checkOut).split(',').slice(0, 2).join(',') : ''}
                placeholder="Auto-calculated"
              />
            </div>
          </div>

          {/* Room */}
          <div className="space-y-1.5">
            <Label htmlFor="roomUnit">Room / unit *</Label>
            <Select
              value={form.roomUnit}
              onValueChange={(v) => handleChange({ target: { name: 'roomUnit', value: v } })}
            >
              <SelectTrigger id="roomUnit">
                <SelectValue placeholder="— Select Room —" />
              </SelectTrigger>
              <SelectContent>
                {ROOM_UNITS.map((r) => (
                  <SelectItem key={r.name} value={r.name}>
                    {r.name} — {formatPeso(r.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pax */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="adults">Adults *</Label>
              <Input
                id="adults"
                name="adults"
                type="number"
                min="1"
                value={form.adults}
                onChange={handleNumberChange}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="children">Children</Label>
              <Input
                id="children"
                name="children"
                type="number"
                min="0"
                value={form.children}
                onChange={handleNumberChange}
              />
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (₱) *</Label>
              <Input
                id="amount"
                name="amount"
                type="text"
                value={form.amount === '' ? '' : formatPeso(form.amount)}
                readOnly
                disabled
                placeholder="Select room & payment"
                title={form.paymentType === 'full' ? 'Full payment — 100% of room price' : 'Downpayment — 50% of room price'}
                className="font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment type *</Label>
              <RadioGroup
                value={form.paymentType}
                onValueChange={(v) => handleChange({ target: { name: 'paymentType', value: v } })}
                className="grid grid-cols-2 gap-2"
              >
                {[
                  { value: 'downpayment', label: 'Down' },
                  { value: 'full', label: 'Full' },
                ].map(({ value, label }) => {
                  const selected = form.paymentType === value;
                  return (
                    <Label
                      key={value}
                      htmlFor={`pay-${value}`}
                      className={cn(
                        'flex items-center justify-center h-10 rounded-md border cursor-pointer transition text-xs font-semibold',
                        selected
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'text-muted-foreground hover:bg-accent/50',
                      )}
                    >
                      <RadioGroupItem value={value} id={`pay-${value}`} className="sr-only" />
                      {label}
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>
          </div>

          {/* Special request */}
          <div className="space-y-1.5">
            <Label htmlFor="specialRequest">Special request</Label>
            <Textarea
              id="specialRequest"
              name="specialRequest"
              value={form.specialRequest}
              onChange={handleChange}
              rows={3}
              placeholder="Any special arrangements, dietary needs, etc."
              className="resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={submitting || hasConflict || checking}
              className="flex-1"
            >
              {checking
                ? 'Checking...'
                : isEditing
                ? 'Review changes'
                : 'Review booking'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Confirmation Modal */}
      {showConfirm && (
        <BookingConfirmModal
          booking={{ ...form, checkIn: actualCheckIn }}
          checkOut={checkOut}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          submitting={submitting}
        />
      )}

      {/* Payment Reminder Modal — shown after booking created, before redirect */}
      {paymentInfo && (
        <PaymentReminderModal
          bookingId={paymentInfo.bookingId}
          paymentUrl={paymentInfo.paymentUrl}
          onClose={() => setPaymentInfo(null)}
        />
      )}
    </>
  );
}
