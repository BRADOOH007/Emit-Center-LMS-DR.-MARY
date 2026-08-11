import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Admin</p>
        <h1 className="page-title">Analytics Overview</h1>
        <p className="page-subtitle mt-1">
          Track enrollments, attendance rates, grades, and identify at-risk students.
        </p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
