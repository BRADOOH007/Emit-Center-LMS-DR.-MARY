import type { Certificate } from '@/types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://learn.emitcenter.com';

const GOLD: [number, number, number] = [196, 152, 64];
const INK: [number, number, number] = [44, 36, 28];
const GRAY: [number, number, number] = [128, 118, 108];
const SOFT: [number, number, number] = [150, 138, 122];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'certificate';
}

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch('/brand/emit-logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Signature flourish — a hand-drawn cursive path for "Dr. Mary Mwangi".
 * Coordinates are relative to the signature box origin (baseline midpoint).
 */
function drawSignatureFlourish(
  doc: import('jspdf').jsPDF,
  cx: number,
  baseline: number,
  scale = 1,
): void {
  const s = scale;
  const pts: Array<[number, number, number, number, number, number]> = [
    [3.5, -9, 10, -11, 9, -2],
    [8.5, 3, 12, -1, 13, 3],
    [14, 6, 16, -4, 19, -6],
    [22, -8, 20, 0, 22, 1],
    [24, 3, 26, -7, 29, -9],
    [32, -11, 31, -2, 33, -1],
    [35, 0, 37, -9, 40, -11],
    [43, -13, 42, -4, 44, -3],
    [46, -2, 48, -8, 51, -7],
    [54, -6, 52, 0, 55, -1],
    [58, -2, 60, -9, 63, -8],
    [66, -7, 65, -1, 68, -3],
    [70, -4, 72, -2, 74, -3],
  ];
  doc.setLineWidth(0.9 * s);
  doc.setDrawColor(...GOLD);
  doc.moveTo(cx - 36 * s, baseline - 2 * s);
  for (const [x1, y1, x2, y2, x3, y3] of pts) {
    doc.curveTo(
      cx + x1 * s,
      baseline + y1 * s,
      cx + x2 * s,
      baseline + y2 * s,
      cx + x3 * s,
      baseline + y3 * s,
    );
  }
}

export async function downloadCertificatePdf(certificate: Certificate): Promise<void> {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;
  const H = 210;
  const cx = W / 2;

  const completionDate = new Date(certificate.completionDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const verifyUrl = `${APP_URL}/certificate/${certificate.verificationHash}`;

  // Background
  doc.setFillColor(255, 252, 246);
  doc.rect(0, 0, W, H, 'F');

  // Borders
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2.4);
  doc.rect(6, 6, W - 12, H - 12);
  doc.setLineWidth(0.7);
  doc.rect(9.5, 9.5, W - 19, H - 19);
  doc.setDrawColor(...SOFT);
  doc.setLineWidth(0.2);
  doc.rect(11.5, 11.5, W - 23, H - 23);

  // Logo
  const logo = await loadLogo();
  if (logo) {
    doc.addImage(logo, 'PNG', cx - 15, 19, 30, 30);
  }

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(27);
  doc.setTextColor(...INK);
  doc.text('EMIT Center', cx, 60, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text('EDUCATIONAL & MAKER INNOVATION TECHNOLOGY', cx, 66, { align: 'center' });

  // Gold divider
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.35);
  doc.line(cx - 42, 72, cx + 42, 72);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...GOLD);
  doc.text('CERTIFICATE OF COMPLETION', cx, 83, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...GRAY);
  doc.text('This is proudly presented to', cx, 92, { align: 'center' });

  // Student name
  doc.setFont('times', 'italic');
  doc.setFontSize(32);
  doc.setTextColor(...INK);
  const name = certificate.studentName.length > 44 ? `${certificate.studentName.slice(0, 44)}…` : certificate.studentName;
  doc.text(name, cx, 105, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...GRAY);
  doc.text('for successfully completing the program', cx, 114, { align: 'center' });

  // Course title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(...GOLD);
  const course = certificate.courseTitle.length > 64 ? `${certificate.courseTitle.slice(0, 64)}…` : certificate.courseTitle;
  doc.text(course, cx, 126, { align: 'center' });

  // Dates
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SOFT);
  doc.text(`Completed ${completionDate}    |    Issued ${issuedDate}`, cx, 137, { align: 'center' });

  // Footer row
  const baseline = 168;

  // Digital stamp (center)
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([1.6, 1.6], 0);
  doc.circle(cx, 160, 16);
  doc.setLineDashPattern([], 0);
  doc.setFillColor(255, 248, 232);
  doc.circle(cx, 160, 11, 'F');
  doc.setDrawColor(...GOLD);
  doc.circle(cx, 160, 11, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...GOLD);
  doc.text('✓', cx, 161, { align: 'center' });
  doc.setFontSize(7);
  doc.text('DIGITAL STAMP', cx, 168, { align: 'center' });

  // Signature (left)
  const sigCx = 74;
  doc.setDrawColor(...SOFT);
  doc.setLineWidth(0.35);
  doc.line(sigCx - 26, baseline, sigCx + 26, baseline);
  drawSignatureFlourish(doc, sigCx, baseline, 0.85);
  doc.setFont('times', 'italic');
  doc.setFontSize(12.5);
  doc.setTextColor(...INK);
  doc.text('Dr. Mary Mwangi', sigCx, baseline - 7, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text('Program Director', sigCx, baseline + 7, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...SOFT);
  doc.text('EMIT Center Learning', sigCx, baseline + 12, { align: 'center' });

  // Verification (right)
  const hashCx = 228;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SOFT);
  doc.text(`Certificate No. ${certificate.verificationHash}`, hashCx, baseline - 2, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text(verifyUrl, hashCx, baseline + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text('Scan-free verification: open the URL above', hashCx, baseline + 11, { align: 'center' });

  doc.save(`${slugify(certificate.studentName)}-${slugify(certificate.courseTitle)}-certificate.pdf`);
}
