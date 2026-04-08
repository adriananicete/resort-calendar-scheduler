import { addDays, setHours, setMinutes, setSeconds } from 'date-fns';

export const TOUR_COLORS = {
  day:       '#F59E0B', // amber
  night:     '#6366F1', // indigo
  overnight: '#8B5CF6', // purple
};

export const TOUR_LABELS = {
  day:       'Day Tour (8am – 5pm)',
  night:     'Night Tour (7pm – 6am)',
  overnight: 'Overnight (7pm – next day 5pm)',
};

export const ROOM_UNITS = [
  'Kubo A',
  'Kubo B',
  'Kubo C',
  'Kubo D',
  'Villa 1',
  'Villa 2',
];

/**
 * Calculate checkout date/time based on check-in date and tour type.
 * @param {Date} checkInDate
 * @param {string} tourType - 'day' | 'night' | 'overnight'
 * @returns {Date|null}
 */
export function calculateCheckOut(checkInDate, tourType) {
  if (!checkInDate || !tourType) return null;

  const base = new Date(checkInDate);
  const clean = (d) => setSeconds(setMinutes(d, 0), 0);

  switch (tourType) {
    case 'day':
      // Same day, 5:00 PM
      return clean(setHours(base, 17));
    case 'night':
      // Next day, 6:00 AM
      return clean(setHours(addDays(base, 1), 6));
    case 'overnight':
      // Next day, 5:00 PM
      return clean(setHours(addDays(base, 1), 17));
    default:
      return null;
  }
}

/**
 * Returns inline style object for react-big-calendar eventPropGetter.
 */
export function getEventStyle(tourType) {
  const bg = TOUR_COLORS[tourType] || '#6B7280';
  return {
    style: {
      backgroundColor: bg,
      borderColor: bg,
      color: '#ffffff',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: '500',
      border: 'none',
    },
  };
}

/**
 * Format a Date to a readable string for display.
 */
export function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
