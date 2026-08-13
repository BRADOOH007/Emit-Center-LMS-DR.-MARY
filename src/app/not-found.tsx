import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-500/10">
          <Compass aria-hidden="true" className="h-8 w-8 text-gold-600 dark:text-gold-400" />
        </div>
        <p className="font-display text-5xl font-bold text-text-primary">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-text-primary">Page not found</h1>
        <p className="mt-2 text-sm text-text-muted">
          The page you are looking for doesn&rsquo;t exist or may have been moved.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a href="/" className="btn btn-gold btn-md">
            Return home
          </a>
          <a href="/courses" className="btn btn-outline btn-md">
            Browse courses
          </a>
        </div>
      </div>
    </div>
  );
}
