import { useState, useEffect, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { isSameDay } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import toast from 'react-hot-toast';
import {
  ROOM_UNITS,
  TOUR_LABELS,
  calculateCheckOut,
  formatDateTime,
  getRoomPrice,
  formatPeso,
} from '../utils/tourTypeHelpers';
import { createBooking, updateBooking } from '../services/api';
import { useConflictCheck } from '../hooks/useConflictCheck';
import BookingConfirmModal from './BookingConfirmModal';

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

export default function BookingForm({ editingBooking, onEditDone, initialDate, bookings = [] }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [checkOut, setCheckOut] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    checkIn:   form.checkIn,
    checkOut,
    excludeId: editingBooking?._id,
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
      checkIn:  form.checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
    };

    try {
      setSubmitting(true);
      if (isEditing) {
        await updateBooking(editingBooking._id, payload);
        toast.success('Booking updated!');
      } else {
        await createBooking(payload);
        toast.success('Booking confirmed!');
      }
      resetForm();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong.';
      toast.error(msg);
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide';

  return (
    <>
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {/* Form Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-4">
          <h2 className="text-white font-bold text-lg">
            {isEditing ? '✏️ Edit Booking' : '📋 New Booking'}
          </h2>
          <p className="text-slate-300 text-xs mt-0.5">
            {isEditing ? 'Update reservation details below' : 'Fill in the reservation details below'}
          </p>
        </div>

        {/* Conflict Warning — no names shown for privacy */}
        {hasConflict && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-300 rounded-lg p-3 flex items-start gap-2">
            <span className="text-red-500 text-lg leading-none">⚠️</span>
            <div>
              <p className="text-red-700 font-semibold text-sm">This date is already booked!</p>
              {conflicts.map((c, i) => (
                <p key={i} className="text-red-600 text-xs mt-0.5">
                  {c.roomUnit} is not available on the selected date and time.
                </p>
              ))}
              <p className="text-red-500 text-xs mt-1">Please choose a different date or room.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Guest Info */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input
                name="guestName"
                value={form.guestName}
                onChange={handleChange}
                required
                placeholder="Juan Dela Cruz"
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Contact No. *</label>
                <input
                  name="contactNumber"
                  value={form.contactNumber}
                  onChange={handleChange}
                  required
                  placeholder="09XXXXXXXXX"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="email@example.com"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Tour Type */}
          <div>
            <label className={labelCls}>Tour Type *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Object.entries(TOUR_LABELS).map(([key, label]) => {
                const colors = {
                  day:       'border-amber-400 bg-amber-50 text-amber-800',
                  night:     'border-indigo-400 bg-indigo-50 text-indigo-800',
                  overnight: 'border-purple-400 bg-purple-50 text-purple-800',
                };
                const selected = form.tourType === key;
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition text-xs font-medium
                      ${selected ? colors[key] : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'}`}
                  >
                    <input
                      type="radio"
                      name="tourType"
                      value={key}
                      checked={selected}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                      style={{
                        borderColor: selected ? 'currentColor' : '#d1d5db',
                        backgroundColor: selected ? 'currentColor' : 'transparent',
                      }}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Check-in Date *</label>
              <DatePicker
                selected={form.checkIn}
                onChange={(date) => setForm((prev) => ({ ...prev, checkIn: date }))}
                dateFormat="MMM d, yyyy"
                placeholderText="Select date"
                minDate={new Date()}
                className={inputCls}
                wrapperClassName="w-full"
                required
                dayClassName={(date) =>
                  bookedDates.some((d) => isSameDay(d, date))
                    ? 'date-already-booked'
                    : undefined
                }
              />
            </div>
            <div>
              <label className={labelCls}>Check-out Date</label>
              <div className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`}>
                {checkOut ? formatDateTime(checkOut).split(',').slice(0, 2).join(',') : 'Auto-calculated'}
              </div>
            </div>
          </div>

          {/* Room + Pax */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className={labelCls}>Room / Unit *</label>
              <select
                name="roomUnit"
                value={form.roomUnit}
                onChange={handleChange}
                required
                className={inputCls}
              >
                <option value="">— Select Room —</option>
                {ROOM_UNITS.map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name} — {formatPeso(r.price)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Adults *</label>
                <input
                  name="adults"
                  type="number"
                  min="1"
                  value={form.adults}
                  onChange={handleNumberChange}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Children</label>
                <input
                  name="children"
                  type="number"
                  min="0"
                  value={form.children}
                  onChange={handleNumberChange}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (₱) *</label>
              <input
                name="amount"
                type="text"
                value={form.amount === '' ? '' : formatPeso(form.amount)}
                readOnly
                disabled
                placeholder="Select room & payment"
                className={`${inputCls} bg-gray-50 text-gray-700 font-semibold cursor-not-allowed`}
                title={form.paymentType === 'full' ? 'Full payment — 100% of room price' : 'Downpayment — 50% of room price'}
              />
            </div>
            <div>
              <label className={labelCls}>Payment Type *</label>
              <div className="flex gap-2 mt-1">
                {[
                  { value: 'downpayment', label: 'Down' },
                  { value: 'full', label: 'Full' },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex-1 text-center py-2 rounded-lg border-2 text-xs font-semibold cursor-pointer transition
                      ${form.paymentType === value
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'}`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value={value}
                      checked={form.paymentType === value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Special Request */}
          <div>
            <label className={labelCls}>Special Request</label>
            <textarea
              name="specialRequest"
              value={form.specialRequest}
              onChange={handleChange}
              rows={3}
              placeholder="Any special arrangements, dietary needs, etc."
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || hasConflict || checking}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition
                ${submitting || hasConflict || checking
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-md'}`}
            >
              {checking
                ? 'Checking...'
                : isEditing
                ? 'Review Changes'
                : 'Review Booking'}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <BookingConfirmModal
          booking={form}
          checkOut={checkOut}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          submitting={submitting}
        />
      )}
    </>
  );
}
