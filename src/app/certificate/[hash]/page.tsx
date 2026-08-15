import { CertificateArt } from '@/components/certificate/CertificateArt';
import { CertificateActions } from '@/components/certificate/CertificateActions';
import { getIssuedCertificates } from '@/lib/certificates';
import { Badge } from '@/components/ui/Badge';

export default async function CertificateVerifyPage({ params }: { params: { hash: string } }) {
  const cert = (await getIssuedCertificates()).find((c) => c.verificationHash === params.hash);

  if (!cert) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10">
            <span className="font-display text-3xl font-bold text-red-500">?</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Certificate Not Found</h1>
          <p className="mt-2 text-sm text-text-muted">
            The verification hash &ldquo;{params.hash}&rdquo; does not match any issued certificate.
            This credential may be invalid or the hash may have been entered incorrectly.
          </p>
          <a href="https://www.emitcenter.com" className="btn btn-gold btn-md mt-6">
            Return to EMIT Center
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4 py-12">
      <div className="w-full max-w-2xl space-y-4">
        <CertificateArt certificate={cert} tone="emerald" />
        <div className="flex flex-wrap items-center justify-center gap-3">
          {cert.revokedAt ? (
            <Badge variant="danger" dot>
              Revoked — This certificate is no longer valid
            </Badge>
          ) : (
            <Badge variant="success" dot>
              Verified — Issued{' '}
              {new Date(cert.issuedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Badge>
          )}
          <CertificateActions certificate={cert} showDownload={!cert.revokedAt} showCopy={false} />
        </div>
        <p className="mt-2 text-center text-xs text-text-muted">
          This certificate was issued by EMIT Center Foundation. Verify authenticity at{' '}
          <span className="font-mono text-gold-600">learn.emitcenter.com/certificate</span>
        </p>
      </div>
    </div>
  );
}