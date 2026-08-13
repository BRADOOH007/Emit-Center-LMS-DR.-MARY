export default function LoadingPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-text-muted">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}
