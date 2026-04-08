import { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { TOUR_COLORS, TOUR_LABELS, getEventStyle } from '../utils/tourTypeHelpers';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
});

const TOUR_TYPE_DISPLAY = {
  day:       'Day Tour',
  night:     'Night Tour',
  overnight: 'Overnight',
};

function toCalendarEvents(bookings) {
  return bookings.map((b) => ({
    id:       b._id,
    title:    TOUR_TYPE_DISPLAY[b.tourType] || b.tourType,
    start:    new Date(b.checkIn),
    end:      new Date(b.checkOut),
    resource: b,
  }));
}

export default function CalendarView({ bookings, onSelectEvent, onSelectSlot }) {
  const events = useMemo(() => toCalendarEvents(bookings), [bookings]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');

  return (
    <div className="bg-white rounded-2xl shadow-md flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-4 rounded-t-2xl">
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
      <div className="p-4">
        <Calendar
          localizer={localizer}
          events={events}
          date={currentDate}
          view={currentView}
          onNavigate={(date) => setCurrentDate(date)}
          onView={(view) => setCurrentView(view)}
          views={['month', 'week', 'day']}
          style={{ height: 620 }}
          selectable
          onSelectEvent={(event) => onSelectEvent(event.resource)}
          onSelectSlot={(slotInfo) => onSelectSlot(slotInfo.start)}
          eventPropGetter={(event) => getEventStyle(event.resource?.tourType)}
          popup
          tooltipAccessor={(event) => TOUR_TYPE_DISPLAY[event.resource?.tourType] || ''}
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
