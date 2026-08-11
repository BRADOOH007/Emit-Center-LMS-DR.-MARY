import { Badge, type BadgeVariant } from '@/components/ui/Badge';

export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'active':
    case 'succeeded':
    case 'present':
    case 'completed':
    case 'verified':
    case 'open':
    case 'live':
    case 'available':
      return 'success';
    case 'pending':
    case 'processing':
    case 'scheduled':
    case 'late':
    case 'draft':
      return 'gold';
    case 'cancelled':
    case 'failed':
    case 'refunded':
    case 'absent':
    case 'declined':
    case 'closed':
    case 'maintenance':
    case 'locked':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={statusVariant(status)}>{status}</Badge>;
}