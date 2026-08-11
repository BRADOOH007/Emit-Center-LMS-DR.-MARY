import { AttendanceTracker } from '@/components/attendance/AttendanceTracker';

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Instructor</p>
        <h1 className="page-title">Attendance Tracker</h1>
        <p className="page-subtitle mt-1">
          Check in students manually or via QR code. Online attendance is captured automatically.
        </p>
      </div>
      <AttendanceTracker />
    </div>
  );
}
