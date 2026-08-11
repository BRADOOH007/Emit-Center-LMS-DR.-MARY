'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Users,
  Wrench,
  Laptop,
  Microscope,
  Printer,
  Package,
  CalendarDays,
  BookOpenCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { FacilityRoom, ResourceBooking, ResourceItem } from '@/types';
import { useSession } from '@/components/providers/AppProviders';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const ROOM_STATUS_BADGE: Record<string, 'success' | 'danger' | 'neutral'> = {
  open: 'success',
  closed: 'danger',
  maintenance: 'neutral',
};

const RESOURCE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  robotics_kit: Wrench,
  laptop: Laptop,
  lab_equipment: Wrench,
  microscope: Microscope,
  '3d_printer': Printer,
};

interface ResourcesPayload {
  rooms: FacilityRoom[];
  resources: ResourceItem[];
  bookings: ResourceBooking[];
}

export function FacilityManager() {
  const [tab, setTab] = useState<'rooms' | 'resources' | 'bookings'>('rooms');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [data, setData] = useState<ResourcesPayload>({ rooms: [], resources: [], bookings: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useSession();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/resources', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error ?? 'Failed to load facilities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleBooked = useCallback(() => {
    setBookingOpen(false);
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <AlertCircle aria-hidden="true" className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {(['rooms', 'resources', 'bookings'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'rounded-btn px-4 py-2 text-sm font-medium transition-colors',
              tab === t
                ? 'bg-gold-500/10 text-gold-700 dark:text-gold-300'
                : 'text-text-muted hover:bg-line-soft hover:text-text-primary',
            )}
          >
            {t === 'rooms' && <Building2 aria-hidden="true" className="mr-1.5 inline h-4 w-4" />}
            {t === 'resources' && <Package aria-hidden="true" className="mr-1.5 inline h-4 w-4" />}
            {t === 'bookings' && <BookOpenCheck aria-hidden="true" className="mr-1.5 inline h-4 w-4" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'bookings' && data.bookings.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gold-500/15 px-1.5 text-[10px] font-bold text-gold-700 dark:text-gold-300">
                {data.bookings.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-16 text-center text-sm text-text-muted">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          Loading facilities…
        </p>
      ) : (
        <>
          {tab === 'rooms' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.rooms.map((room) => (
                <div key={room.id} className="card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-text-primary">{room.name}</h3>
                      <p className="text-xs text-text-muted">{room.building}, Floor {room.floor}</p>
                    </div>
                    <Badge variant={ROOM_STATUS_BADGE[room.status] as 'success' | 'danger' | 'neutral'} dot>
                      {room.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Users aria-hidden="true" className="h-3.5 w-3.5" />
                      {room.capacity} seats
                    </span>
                    {(room.amenities ?? []).slice(0, 3).map((a) => (
                      <span key={a} className="badge badge-neutral !px-1.5 !text-[10px]">{a}</span>
                    ))}
                  </div>
                </div>
              ))}
              {data.rooms.length === 0 && (
                <p className="col-span-full py-12 text-center text-sm text-text-muted">No rooms configured.</p>
              )}
            </div>
          )}

          {tab === 'resources' && (
            <div className="space-y-4">
              {data.resources.map((resource) => {
                const Icon = RESOURCE_TYPE_ICONS[resource.type] ?? Package;
                return (
                  <div key={resource.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-500/10">
                        <Icon aria-hidden="true" className="h-5 w-5 text-gold-600 dark:text-gold-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">{resource.name}</p>
                        <p className="text-xs text-text-muted">{resource.location} &middot; {resource.type.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={cn('text-sm font-bold', resource.available <= 2 && 'text-red-600 dark:text-red-400', resource.available > 2 && 'text-text-primary')}>
                          {resource.available}/{resource.quantity}
                        </p>
                        <p className="text-[11px] text-text-muted">available</p>
                      </div>
                      <Badge variant={resource.status === 'available' ? 'success' : resource.status === 'maintenance' ? 'danger' : 'neutral'}>
                        {resource.status.replace(/_/g, ' ')}
                      </Badge>
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => {
                          setSelectedResource(resource.id);
                          setBookingOpen(true);
                        }}
                        disabled={resource.available <= 0}
                      >
                        Book
                      </Button>
                    </div>
                  </div>
                );
              })}
              {data.resources.length === 0 && (
                <p className="py-12 text-center text-sm text-text-muted">No resources configured.</p>
              )}
            </div>
          )}

          {tab === 'bookings' && (
            <div className="space-y-3">
              {data.bookings.length === 0 && (
                <div className="flex flex-col items-center py-12 text-center">
                  <CalendarDays aria-hidden="true" className="mb-3 h-10 w-10 text-text-muted/40" />
                  <p className="text-sm font-medium text-text-primary">No active bookings</p>
                  <p className="text-xs text-text-muted">Book a resource or room to get started.</p>
                </div>
              )}
              {data.bookings.map((booking) => (
                <div key={booking.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">
                        {booking.resource?.name ?? 'Resource'}
                        {booking.room?.name ? ` · ${booking.room.name}` : ''}
                      </p>
                      {booking.userId === user.id && <Badge variant="gold">Mine</Badge>}
                    </div>
                    <p className="text-xs text-text-muted">
                      Booked by {booking.user?.fullName ?? 'Unknown'} &middot;{' '}
                      {new Date(booking.startDate).toLocaleDateString()} – {new Date(booking.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={booking.status === 'active' ? 'success' : 'neutral'}>{booking.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {bookingOpen && (
        <BookingModal
          resourceId={selectedResource}
          resources={data.resources}
          onClose={() => setBookingOpen(false)}
          onBooked={handleBooked}
        />
      )}
    </div>
  );
}

function BookingModal({
  resourceId,
  resources,
  onClose,
  onBooked,
}: {
  resourceId: string;
  resources: ResourceItem[];
  onClose: () => void;
  onBooked: () => void;
}) {
  const [form, setForm] = useState({ courseId: '', startDate: '', endDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resource = resources.find((r) => r.id === resourceId);

  const handleSubmit = async () => {
    if (!form.courseId || !form.startDate || !form.endDate) {
      setError('Course and date range are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId,
          courseId: form.courseId,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Booking failed');
        return;
      }
      onBooked();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500/10">
            <Package aria-hidden="true" className="h-5 w-5 text-gold-600" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">Book {resource?.name}</p>
            <p className="text-xs text-text-muted">Available: {resource?.available}/{resource?.quantity}</p>
          </div>
        </div>
        <div className="divider" />
        <div className="space-y-3">
          <div>
            <label htmlFor="bok-course" className="label">Course</label>
            <select id="bok-course" value={form.courseId} onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))} className="input !py-2">
              <option value="">Select a course...</option>
              <option value="crs_0001">Robotics 101: Build Your First Robot</option>
              <option value="crs_0002">Python Programming for Beginners</option>
              <option value="crs_0005">AI &amp; Machine Learning Foundations</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="bok-start" className="label">Start date</label>
              <input id="bok-start" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} className="input !py-2" />
            </div>
            <div>
              <label htmlFor="bok-end" className="label">End date</label>
              <input id="bok-end" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} className="input !py-2" />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="gold" onClick={handleSubmit} className="flex-1" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              'Confirm Booking'
            )}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md animate-scale-in rounded-card border border-line bg-base-elevated p-5 shadow-pop">
        {children}
      </div>
    </div>
  );
}