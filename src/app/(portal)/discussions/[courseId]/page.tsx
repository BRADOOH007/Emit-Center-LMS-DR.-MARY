import { DiscussionForum } from '@/components/communication/DiscussionForum';

export default function DiscussionsPage({ params }: { params: { courseId: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Community</p>
        <h1 className="page-title">Discussion Forum</h1>
        <p className="page-subtitle mt-1">
          Engage with classmates and instructors. Threads are ordered by activity with pinned topics first.
        </p>
      </div>
      <DiscussionForum courseId={params.courseId} />
    </div>
  );
}
