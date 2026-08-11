import { CalendarView } from '@/components/schedule/CalendarView';

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Schedule</p>
        <h1 className="page-title">Class Timetable</h1>
        <p className="page-subtitle mt-1">
          All sessions shown in your local time zone. Toggle to view host time.
        </p>
      </div>
      <CalendarView />
    </div>
  );
}
