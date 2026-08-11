import { CertificateGenerator } from '@/components/admin/CertificateGenerator';

export default function AdminCertificatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="header-kicker">Admin</p>
        <h1 className="page-title">Certificate Generator</h1>
        <p className="page-subtitle mt-1">
          Generate verifiable PDF-ready completion certificates with EMIT Center branding and unique verification hashes.
        </p>
      </div>
      <CertificateGenerator />
    </div>
  );
}
