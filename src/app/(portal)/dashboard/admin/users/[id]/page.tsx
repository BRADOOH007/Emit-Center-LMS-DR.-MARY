import { AdminUserDetail } from '@/components/dashboard/admin/AdminUserDetail';

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  return <AdminUserDetail userId={params.id} />;
}