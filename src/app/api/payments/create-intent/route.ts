import { NextRequest } from 'next/server';
import { MOCK_COURSES } from '@/lib/mock-data';
import { MOCK_USERS } from '@/lib/mock-data';
import { ok, badRequest, notFound, parseBody } from '@/lib/api-helpers';
import type { SupportedCurrency } from '@/types';

const PROMO_CODES: Record<string, { discountPercent: number; maxUses: number; used: number }> = {
  EMIT20: { discountPercent: 20, maxUses: 100, used: 12 },
  STEM10: { discountPercent: 10, maxUses: 50, used: 8 },
  SCHOLAR50: { discountPercent: 50, maxUses: 20, used: 5 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody<{
      courseId: string;
      userId: string;
      currency: SupportedCurrency;
      promoCode?: string;
    }>(request);

    if (!body.courseId || !body.userId || !body.currency) {
      return badRequest('courseId, userId, and currency are required');
    }

    const course = MOCK_COURSES.find((c) => c.id === body.courseId);
    if (!course) return notFound('Course not found');

    const user = MOCK_USERS.find((u) => u.id === body.userId);
    if (!user) return notFound('User not found');

    const price = course.pricing.find((p) => p.currency === body.currency);
    if (!price) return badRequest(`No pricing for ${body.currency}`);

    let discountPercent = 0;
    let promoValid = false;

    if (body.promoCode) {
      const promo = PROMO_CODES[body.promoCode.toUpperCase()];
      if (promo && promo.used < promo.maxUses) {
        discountPercent = promo.discountPercent;
        promoValid = true;
        promo.used += 1;
      }
    }

    const discountedAmount = Math.round(price.amount * (1 - discountPercent / 100));

    const paymentIntent = {
      id: `pi_mock_${Date.now()}`,
      clientSecret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).slice(2)}`,
      amount: discountedAmount,
      currency: body.currency.toLowerCase(),
      course: { id: course.id, title: course.title },
      promoApplied: promoValid ? body.promoCode?.toUpperCase() : null,
      discountPercent,
      originalAmount: price.amount,
    };

    return ok(paymentIntent);
  } catch {
    return badRequest('Invalid request body');
  }
}
