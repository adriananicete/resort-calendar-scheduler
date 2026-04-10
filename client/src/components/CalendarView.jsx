import { useMemo, useState, useRef, useEffect } from 'react';
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
    title:    `${TOUR_TYPE_DISPLAY[b.tourType] || b.tourType}: ${b.roomUnit}`,
    start:    new Date(b.checkIn),
    end:      new Date(b.checkOut),
    resource: b,
  }));
}

const VIEW_LABELS = { month: 'Month', week: 'Week', day: 'Day' };

function CustomToolbar({ label, onNavigate, onView, view, views, onNewBooking }) {
  return (
    <div className="calendar-toolbar">
      {/* Mobile-only: title row with New Booking button */}
      <div className="calendar-toolbar__title-row">
        <span className="rbc-toolbar-label">{label}</span>
        <button
          type="button"
          onClick={onNewBooking}
          className="calendar-toolbar__new-btn"
        >
          <span className="text-base leading-none">+</span> New Booking
        </button>
      </div>

      {/* Nav row — always visible */}
      <div className="calendar-toolbar__nav-row">
        <span className="rbc-btn-group">
          <button type="button" onClick={() => onNavigate('TODAY')}>Today</button>
          <button type="button" onClick={() => onNavigate('PREV')}>‹</button>
          <button type="button" onClick={() => onNavigate('NEXT')}>›</button>
        </span>

        {/* Desktop-only centered label */}
        <span className="rbc-toolbar-label calendar-toolbar__label-desktop">{label}</span>

        <span className="rbc-btn-group">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              className={view === v ? 'rbc-active' : ''}
              onClick={() => onView(v)}
            >
              {VIEW_LABELS[v] || v}
            </button>
          ))}
        </span>
      </div>
    </div>
  );
}

export default function CalendarView({ bookings, onSelectSlot, onNewBooking, formHeight }) {
  const events = useMemo(() => toCalendarEvents(bookings), [bookings]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');

  // Custom date number — tap/click opens the booking form directly.
  // Uses pointerdown so it fires before any touch-related preventDefaults,
  // and applies touch-action: manipulation to kill mobile tap delay.
  const calendarComponents = useMemo(() => ({
    month: {
      dateHeader: ({ date, label }) => {
        const trigger = (e) => {
          e.stopPropagation();
          e.preventDefault();
          onSelectSlot(date);
        };
        return (
          <button
            type="button"
            onPointerDown={trigger}
            onClick={(e) => e.stopPropagation()}
            className="rbc-button-link"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit',
              color: 'inherit',
              touchAction: 'manipulation',
            }}
          >
            {label}
          </button>
        );
      },
    },
    toolbar: (toolbarProps) => (
      <CustomToolbar {...toolbarProps} onNewBooking={onNewBooking} />
    ),
  }), [onSelectSlot, onNewBooking]);

  // Measure header height so we can subtract it from the total
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(90);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, []);

  // Calendar height = form height minus header minus padding (32px top+bottom)
  const calHeight = formHeight
    ? Math.max(formHeight - headerHeight - 32, 400)
    : 580;

  return (
    <div className="bg-white rounded-lg shadow-md flex flex-col">
      {/* Header */}
      <div
        ref={headerRef}
        className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-4 rounded-t-lg"
      >
        <h2 className="text-white font-bold text-lg">📆 Booking Calendar</h2>
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
          style={{ height: calHeight }}
          onSelectEvent={() => {}}
          components={calendarComponents}
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
