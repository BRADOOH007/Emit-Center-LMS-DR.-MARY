import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProfileSettings } from '@/components/profile/ProfileSettings';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Account</p>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle mt-1">
          View and manage your profile, photo, and account preferences.
        </p>
      </div>
      <ProfileSettings user={session.user} />
    </div>
  );
}