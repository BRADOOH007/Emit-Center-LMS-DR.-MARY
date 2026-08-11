import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getRoleHome } from '@/lib/roles';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  redirect(getRoleHome(session.user.activeRole));
}
