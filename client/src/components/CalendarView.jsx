import { useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { TOUR_COLORS, TOUR_LABELS, getEventStyle } from '../utils/tourTypeHelpers';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
});

function toCalendarEvents(bookings) {
  return bookings.map((b) => ({
    id:       b._id,
    title:    `${b.roomUnit} — ${b.guestName}`,
    start:    new Date(b.checkIn),
    end:      new Date(b.checkOut),
    resource: b,
  }));
}

export default function CalendarView({ bookings, onSelectEvent, onSelectSlot }) {
  const events = useMemo(() => toCalendarEvents(bookings), [bookings]);

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-4">
        <h2 className="text-white font-bold text-lg">📆 Booking Calendar</h2>
        {/* Color Legend */}
        <div className="flex flex-wrap gap-3 mt-2">
          {Object.entries(TOUR_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: TOUR_COLORS[key] }}
              />
              <span className="text-slate-300 text-xs">{label.split('(')[0].trim()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-4 min-h-0">
        <Calendar
          localizer={localizer}
          events={events}
          defaultView="month"
          views={['month', 'week', 'day']}
          style={{ height: '100%' }}
          selectable
          onSelectEvent={(event) => onSelectEvent(event.resource)}
          onSelectSlot={(slotInfo) => onSelectSlot(slotInfo.start)}
          eventPropGetter={(event) => getEventStyle(event.resource?.tourType)}
          popup
          tooltipAccessor={(event) =>
            `${event.resource?.roomUnit} — ${event.resource?.guestName}\n${TOUR_LABELS[event.resource?.tourType]}`
          }
          formats={{
            eventTimeRangeFormat: () => '',
          }}
          messages={{
            today: 'Today',
            previous: '‹',
            next: '›',
          }}
        />
      </div>
    </div>
  );
}
