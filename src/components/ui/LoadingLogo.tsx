export function LoadingLogo({ fullHeight = false }: { fullHeight?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${
        fullHeight ? 'min-h-screen' : 'min-h-[60vh]'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/roundlogo%20emit.png"
        alt="EMIT Center"
        width={72}
        height={72}
        className="animate-logo-bounce rounded-full"
      />
      <div className="flex flex-col items-center gap-1.5">
        <span className="font-display text-base font-semibold tracking-tight text-text-primary">EMIT Center</span>
        <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-600 dark:text-gold-400">
          Loading
          <span className="ml-1 inline-flex items-center gap-[3px]" aria-hidden="true">
            <span className="h-[3px] w-[3px] animate-pulse rounded-full bg-current" style={{ animationDelay: '0ms' }} />
            <span className="h-[3px] w-[3px] animate-pulse rounded-full bg-current" style={{ animationDelay: '150ms' }} />
            <span className="h-[3px] w-[3px] animate-pulse rounded-full bg-current" style={{ animationDelay: '300ms' }} />
          </span>
        </span>
      </div>
    </div>
  );
}
