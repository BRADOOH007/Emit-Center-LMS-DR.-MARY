'use client';

import { useCallback, useState, type ReactNode } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Percent,
  ShieldCheck,
  X,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import type { Course, SupportedCurrency } from '@/types';
import { CURRENCY_SYMBOLS } from '@/lib/i18n/currency';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/ui/LogoMark';
import { cn } from '@/lib/utils';
import { useSession } from '@/components/providers/AppProviders';

type Step = 'review' | 'payment' | 'confirming' | 'success' | 'error';

export function EnrollmentModalTrigger({
  course,
  userCurrency,
  seatsRemaining,
}: {
  course: Course;
  userCurrency: SupportedCurrency;
  seatsRemaining: number;
}) {
  const [open, setOpen] = useState(false);

  if (seatsRemaining <= 0) {
    return (
      <div className="space-y-3">
        <p className="text-center text-sm font-semibold text-red-600 dark:text-red-400">
          This course is full. Join the waitlist below.
        </p>
        <Button variant="brown" size="lg" fullWidth disabled>
          Join Waitlist
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="gold"
        size="lg"
        fullWidth
        onClick={() => setOpen(true)}
      >
        Enroll Now
      </Button>

      {open && (
        <EnrollmentModal
          course={course}
          userCurrency={userCurrency}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function EnrollmentModal({
  course,
  userCurrency,
  onClose,
}: {
  course: Course;
  userCurrency: SupportedCurrency;
  onClose: () => void;
}) {
  const { user } = useSession();
  const [step, setStep] = useState<Step>('review');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<{
    code: string;
    discountPercent: number;
  } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'demo'>('demo');
  const [cardInfo, setCardInfo] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');

  const activePrice = course.pricing.find((p) => p.currency === userCurrency) ?? course.pricing[0];
  const originalAmount = activePrice.amount / 100;
  const discountPercent = promoApplied?.discountPercent ?? 0;
  const discountedAmount = Math.round(originalAmount * (1 - discountPercent / 100));
  const savingsAmount = originalAmount - discountedAmount;
  const symbol = CURRENCY_SYMBOLS[userCurrency];

  const totalInCents = discountedAmount * 100;

  const applyPromoCode = useCallback(async () => {
    if (!promoCode.trim()) {
      setPromoError('Enter a promo code');
      return;
    }
    setPromoLoading(true);
    setPromoError('');

    try {
      const res = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          currency: userCurrency,
          promoCode: promoCode.trim(),
        }),
      });
      const json = await res.json();

      if (json.success && json.data.promoApplied) {
        setPromoApplied({
          code: json.data.promoApplied,
          discountPercent: json.data.discountPercent,
        });
        setPromoCode('');
      } else if (json.success) {
        setPromoError('Invalid or expired promo code');
      } else {
        setPromoError(json.error ?? 'Failed to validate promo code');
      }
    } catch {
      setPromoError('Network error. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  }, [promoCode, course.id, userCurrency]);

  const handlePayment = useCallback(async () => {
    setProcessingPayment(true);
    setPaymentError('');

    try {
      const intentRes = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          currency: userCurrency,
          promoCode: promoApplied?.code,
        }),
      });
      const intentJson = await intentRes.json();
      if (!intentJson.success) {
        setPaymentError(intentJson.error ?? 'Failed to create payment');
        setStep('error');
        return;
      }

      setStep('confirming');

      await new Promise((resolve) => setTimeout(resolve, 1200));

      const confirmRes = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          paymentIntentId: intentJson.data.paymentIntentId,
        }),
      });
      const confirmJson = await confirmRes.json();
      if (!confirmJson.success) {
        setPaymentError(confirmJson.error ?? 'Payment succeeded but enrollment failed. Contact support.');
        setStep('error');
        return;
      }

      setEnrollmentId(confirmJson.data.enrollment.id);
      setStep('success');
    } catch {
      setPaymentError('Payment processing failed. Please try again.');
      setStep('error');
    } finally {
      setProcessingPayment(false);
    }
  }, [course.id, userCurrency, promoApplied]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    },
    [onClose],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enrollment checkout"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in rounded-card border border-line bg-base-elevated shadow-pop scrollbar-thin">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {step === 'success' ? 'Enrollment Confirmed' : step === 'error' ? 'Payment Failed' : 'Checkout'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost btn-sm !px-1.5">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {step === 'success' && (
          <div className="px-5 py-8 text-center">
            <CheckCircle2 aria-hidden="true" className="mx-auto mb-4 h-14 w-14 text-emerald-500" />
            <h3 className="text-xl font-bold text-text-primary">You&apos;re enrolled!</h3>
            <p className="mt-2 text-sm text-text-muted">
              {course.title}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Enrollment ID: {enrollmentId}
            </p>
            <p className="mt-4 text-xs text-text-muted">
              A confirmation email has been sent with your schedule and access details.
            </p>
            <Button variant="gold" className="mt-6" onClick={onClose}>
              Go to My Courses
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div className="px-5 py-8 text-center">
            <AlertTriangle aria-hidden="true" className="mx-auto mb-4 h-14 w-14 text-red-500" />
            <h3 className="text-xl font-bold text-text-primary">Payment failed</h3>
            <p className="mt-2 text-sm text-text-muted">{paymentError}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="ghost" onClick={() => setStep('payment')}>
                Try again
              </Button>
              <Button variant="gold" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}

        {(step === 'review' || step === 'payment' || step === 'confirming') && (
          <>
            <div className="border-b border-line bg-line-soft/50 px-5 py-3">
              <p className="font-semibold text-text-primary">{course.title}</p>
              <p className="text-xs text-text-muted">{course.schedule.days.join(', ')} &middot; {course.schedule.timeSlots[0]?.start}–{course.schedule.timeSlots[0]?.end}</p>
            </div>

            {step === 'review' && (
              <div className="space-y-5 px-5 py-5">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Course price</span>
                    <span className="text-text-primary">{symbol}{originalAmount}</span>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Promo &ldquo;{promoApplied.code}&rdquo; ({promoApplied.discountPercent}% off)</span>
                      <span>-{symbol}{savingsAmount}</span>
                    </div>
                  )}
                  <div className="divider my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-text-primary">{symbol}{discountedAmount} {userCurrency}</span>
                  </div>
                </div>

                <div>
                  <p className="label flex items-center gap-1.5">
                    <Percent aria-hidden="true" className="h-3.5 w-3.5" />
                    Promo code
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                      onKeyDown={(event) => event.key === 'Enter' && applyPromoCode()}
                      placeholder="e.g. STEM10"
                      disabled={!!promoApplied}
                      className="input !py-2 flex-1"
                    />
                    {promoApplied ? (
                      <Button variant="ghost" size="md" onClick={() => { setPromoApplied(null); setPromoError(''); }}>
                        Remove
                      </Button>
                    ) : (
                      <Button variant="outline" size="md" onClick={applyPromoCode} disabled={promoLoading}>
                        {promoLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : 'Apply'}
                      </Button>
                    )}
                  </div>
                  {promoError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{promoError}</p>
                  )}
                </div>

                <Button variant="gold" size="lg" fullWidth onClick={() => setStep('payment')}>
                  Continue to payment
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-5 px-5 py-5">
                <div className="flex gap-2">
                  <Button
                    variant={paymentMethod === 'demo' ? 'gold' : 'outline'}
                    size="sm"
                    onClick={() => setPaymentMethod('demo')}
                  >
                    Demo Payment
                  </Button>
                  <Button
                    variant={paymentMethod === 'card' ? 'gold' : 'outline'}
                    size="sm"
                    onClick={() => setPaymentMethod('card')}
                  >
                    <CreditCard aria-hidden="true" className="h-3.5 w-3.5" />
                    Credit Card
                  </Button>
                </div>

                {paymentMethod === 'demo' ? (
                  <div className="rounded-lg border border-line bg-line-soft/50 p-3 text-center">
                    <ShieldCheck aria-hidden="true" className="mx-auto mb-2 h-8 w-8 text-gold-500" />
                    <p className="text-sm font-medium text-text-primary">Demo checkout mode</p>
                    <p className="mt-1 text-xs text-text-muted">
                      No real charges will be made. Clicking &ldquo;Pay&rdquo; will simulate a successful payment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="card-name" className="label">Cardholder name</label>
                      <input
                        id="card-name"
                        type="text"
                        value={cardInfo.name}
                        onChange={(event) => setCardInfo((prev) => ({ ...prev, name: event.target.value }))}
                        className="input !py-2"
                        placeholder="Name on card"
                      />
                    </div>
                    <div>
                      <label htmlFor="card-number" className="label">Card number</label>
                      <input
                        id="card-number"
                        type="text"
                        value={cardInfo.number}
                        onChange={(event) => setCardInfo((prev) => ({ ...prev, number: event.target.value }))}
                        className="input !py-2"
                        placeholder="4242 4242 4242 4242"
                        maxLength={19}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="card-expiry" className="label">Expiry</label>
                        <input
                          id="card-expiry"
                          type="text"
                          value={cardInfo.expiry}
                          onChange={(event) => setCardInfo((prev) => ({ ...prev, expiry: event.target.value }))}
                          className="input !py-2"
                          placeholder="MM/YY"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <label htmlFor="card-cvc" className="label">CVC</label>
                        <input
                          id="card-cvc"
                          type="text"
                          value={cardInfo.cvc}
                          onChange={(event) => setCardInfo((prev) => ({ ...prev, cvc: event.target.value }))}
                          className="input !py-2"
                          placeholder="123"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-display text-lg font-bold text-text-primary">
                      {symbol}{discountedAmount}
                    </span>
                    <span className="ml-1 text-xs text-text-muted">{userCurrency}</span>
                  </div>
                  {discountPercent > 0 && (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {discountPercent}% off
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('review')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    variant="gold"
                    fullWidth
                    onClick={handlePayment}
                    disabled={processingPayment}
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard aria-hidden="true" className="h-4 w-4" />
                        Pay {symbol}{discountedAmount}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 'confirming' && (
              <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                <div className="mb-4">
                  <LogoMark size={64} showLabel={false} />
                </div>
                  <p className="text-lg font-semibold text-text-primary">Processing your payment</p>
                <p className="mt-1 text-sm text-text-muted">Please don&apos;t close this window.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
