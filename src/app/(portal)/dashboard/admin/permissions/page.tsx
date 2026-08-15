import { requireSuperAdmin } from '@/lib/route-guards';
import { AdminPermissions } from '@/components/dashboard/admin/AdminPermissions';

export default async function AdminPermissionsPage() {
  await requireSuperAdmin();
  return <AdminPermissions />;
}