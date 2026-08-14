import { MessagingInbox } from '@/components/communication/MessagingInbox';
import { getSessionUser } from '@/lib/auth';

export default async function MessagesPage() {
  const user = await getSessionUser();
  const userId = user?.id ?? '';

  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Communication</p>
        <h1 className="page-title">Messages</h1>
        <p className="page-subtitle mt-1">
          Direct messaging between parents and instructors. Messages are private and end-to-end.
        </p>
      </div>
      <MessagingInbox userId={userId} roles={user?.roles ?? []} />
    </div>
  );
}