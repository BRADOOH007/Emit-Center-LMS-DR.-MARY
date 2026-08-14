import { ArrowLeft, ExternalLink } from 'lucide-react';
import { PORTAL_RETURN_LABEL, PORTAL_URL } from '@/config/nav';

export function ReturnToPortalBar() {
  return (
    <div className="relative z-40 bg-brown-900 text-gold-300">
      <a
        href={PORTAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={`${PORTAL_RETURN_LABEL} (opens in a new tab)`}
        className="group mx-auto flex max-w-[1400px] items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold uppercase tracking-widest transition-colors duration-200 hover:text-gold-200"
      >
        <ArrowLeft
          aria-hidden="true"
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        <span>{PORTAL_RETURN_LABEL}</span>
        <ExternalLink
          aria-hidden="true"
          className="h-3 w-3 opacity-60 transition-opacity duration-200 group-hover:opacity-100"
        />
      </a>
    </div>
  );
}
