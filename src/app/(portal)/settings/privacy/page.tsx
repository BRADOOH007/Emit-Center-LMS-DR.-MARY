import { PrivacySettings } from '@/components/compliance/PrivacySettings';
import { getSessionUser } from '@/lib/auth';

export default async function PrivacyPage() {
  const user = await getSessionUser();
  const userId = user?.id ?? '';

  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Settings</p>
        <h1 className="page-title">Privacy & Compliance</h1>
        <p className="page-subtitle mt-1">
          Manage your data privacy, consent preferences, export your data, and request account deletion.
        </p>
      </div>
      <PrivacySettings userId={userId} />
    </div>
  );
}