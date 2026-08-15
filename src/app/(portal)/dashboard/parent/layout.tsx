import { requireParent } from '@/lib/route-guards';

export default async function ParentDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireParent();
  return <>{children}</>;
}