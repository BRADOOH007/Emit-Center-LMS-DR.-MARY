import { requireAdmin } from '@/lib/route-guards';

export default async function AdminPagesLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}