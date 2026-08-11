import { NotificationList } from '@/components/communication/NotificationCenter';
import { getSessionUser } from '@/lib/auth';

export default async function NotificationsPage() {
  const user = await getSessionUser();
  const userId = user?.id ?? '';

  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Notifications</p>
        <h1 className="page-title">All Notifications</h1>
        <p className="page-subtitle mt-1">
          Assignment reminders, grade alerts, discussion replies, and announcements.
        </p>
      </div>
      <NotificationList userId={userId} />
    </div>
  );
}