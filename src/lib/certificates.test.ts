import { describe, it, expect } from 'vitest';
import { verificationHashFor } from '@/lib/certificates';

describe('certificate verification hash', () => {
  it('is unique per call', () => {
    const a = verificationHashFor('user-1', 'course-1');
    const b = verificationHashFor('user-1', 'course-1');
    expect(a).not.toBe(b);
  });

  it('matches the EMIT- + 12 hex format', () => {
    expect(verificationHashFor('u', 'c')).toMatch(/^EMIT-[0-9A-F]{12}$/);
  });

  it('cannot be derived from inputs', () => {
    // Deterministic forgeries (same inputs -> same hash) must not occur.
    const one = verificationHashFor('alice', 'robotics-101');
    const two = verificationHashFor('alice', 'robotics-101');
    const alt = verificationHashFor('robotics-101', 'alice');
    expect(one).not.toBe(two);
    expect(one).not.toBe(alt);
  });
});