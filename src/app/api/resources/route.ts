import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, forbid, notFound, parseBody } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';
import type { FacilityRoom, ResourceItem, ResourceBooking, User } from '@/types';

function mapRoom(row: {
  id: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  amenities: unknown;
  status: string;
}): FacilityRoom {
  return {
    id: row.id,
    name: row.name,
    building: row.building,
    floor: row.floor,
    capacity: row.capacity,
    amenities: (row.amenities as string[]) ?? [],
    status: row.status as FacilityRoom['status'],
  };
}

function mapResource(row: {
  id: string;
  name: string;
  type: string;
  quantity: number;
  available: number;
  status: string;
  location: string;
}): ResourceItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ResourceItem['type'],
    quantity: row.quantity,
    available: row.available,
    status: row.status as ResourceItem['status'],
    location: row.location,
  };
}

function mapUser(row: {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  roles: string[];
  activeRole: string;
}): User {
  return {
    id: row.id,
    fullName: row.fullName,
    name: row.fullName,
    email: row.email,
    avatarUrl: row.avatarUrl ?? undefined,
    roles: row.roles as User['roles'],
    activeRole: row.activeRole as User['activeRole'],
    locale: 'en-US',
    timeZone: 'America/New_York',
    currency: 'USD',
  };
}

interface BookingRow {
  id: string;
  resourceId: string;
  roomId: string | null;
  userId: string;
  courseId: string;
  sessionId: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  resource?: {
    id: string;
    name: string;
    type: string;
    quantity: number;
    available: number;
    status: string;
    location: string;
  } | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    roles: string[];
    activeRole: string;
  } | null;
}

function buildBookingMapper(rooms: FacilityRoom[]) {
  return (row: BookingRow): ResourceBooking => ({
    id: row.id,
    resourceId: row.resourceId,
    roomId: row.roomId ?? undefined,
    room: row.roomId ? rooms.find((r) => r.id === row.roomId) : undefined,
    userId: row.userId,
    courseId: row.courseId,
    sessionId: row.sessionId ?? '',
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    status: row.status as ResourceBooking['status'],
    resource: row.resource ? mapResource(row.resource) : undefined,
    user: row.user ? mapUser(row.user) : undefined,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type');

  const rooms = (await prisma.facilityRoom.findMany({ orderBy: { name: 'asc' } })).map(mapRoom);
  const resources = await prisma.resourceItem.findMany({
    where: type ? { type } : undefined,
    orderBy: { name: 'asc' },
  });
  const bookings = await prisma.resourceBooking.findMany({
    include: {
      resource: {
        select: { id: true, name: true, type: true, quantity: true, available: true, status: true, location: true },
      },
      user: { select: { id: true, fullName: true, email: true, avatarUrl: true, roles: true, activeRole: true } },
    },
    orderBy: { startDate: 'desc' },
  });

  return ok({
    rooms,
    resources: resources.map(mapResource),
    bookings: bookings.map(buildBookingMapper(rooms)),
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return forbid('Sign in to book a resource');

  try {
    const body = await parseBody<{
      resourceId: string;
      courseId: string;
      startDate: string;
      endDate: string;
    }>(request);
    if (!body.resourceId || !body.courseId || !body.startDate || !body.endDate) {
      return badRequest('Missing required fields');
    }

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      return badRequest('Invalid date range');
    }

    const resource = await prisma.resourceItem.findUnique({ where: { id: body.resourceId } });
    if (!resource) return notFound('Resource not found');
    if (resource.available <= 0) return badRequest('Resource is no longer available');

    const booking = await prisma.resourceBooking.create({
      data: {
        resourceId: body.resourceId,
        userId: user.id,
        courseId: body.courseId,
        startDate,
        endDate,
        status: 'active',
      },
      include: {
        resource: {
          select: { id: true, name: true, type: true, quantity: true, available: true, status: true, location: true },
        },
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true, roles: true, activeRole: true } },
      },
    });

    await prisma.resourceItem.update({
      where: { id: body.resourceId },
      data: { available: { decrement: 1 } },
    });

    return ok(buildBookingMapper([])({ ...booking, sessionId: booking.sessionId }), 201);
  } catch {
    return badRequest('Invalid request body');
  }
}