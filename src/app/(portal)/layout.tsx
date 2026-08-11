import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  return <AppLayout user={session.user}>{children}</AppLayout>;
}
