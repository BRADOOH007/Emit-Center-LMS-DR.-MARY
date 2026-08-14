import { prisma } from '@/lib/prisma';
import type { Badge } from '@/types';

const DEFAULT_BADGES = [
  { name: 'First Steps', description: 'Enrolled in your first course.', category: 'achievement', icon: 'award' },
  { name: 'Course Completer', description: 'Completed a full course.', category: 'achievement', icon: 'award' },
  { name: 'High Achiever', description: 'Earned an A grade in a course.', category: 'mastery', icon: 'award' },
  { name: 'Discussion Starter', description: 'Started your first discussion thread.', category: 'participation', icon: 'award' },
  { name: 'Perfect Attendance', description: 'Attended every session in a course.', category: 'participation', icon: 'award' },
];

async function ensureBadge(name: string, description: string, category: string, icon: string) {
  return prisma.badge.upsert({
    where: { name },
    update: {},
    create: { name, description, category, icon },
  });
}

export async function awardBadge(userId: string, badgeName: string, courseId?: string): Promise<Badge | null> {
  const def = DEFAULT_BADGES.find((b) => b.name === badgeName);
  if (!def) return null;

  const badge = await ensureBadge(def.name, def.description, def.category, def.icon);

  const existing = await prisma.userBadge.findFirst({
    where: { userId, badgeId: badge.id, courseId: courseId ?? null },
  });
  if (existing) return null;

  await prisma.userBadge.create({
    data: { userId, badgeId: badge.id, courseId: courseId ?? null },
  });

  return { ...badge, earnedAt: new Date().toISOString(), courseId: courseId ?? undefined };
}

export async function getUserBadges(userId: string): Promise<Badge[]> {
  const rows = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { earnedAt: 'desc' },
    include: { badge: true },
  });
  return rows.map((r) => ({
    id: r.badge.id,
    name: r.badge.name,
    description: r.badge.description,
    category: r.badge.category,
    icon: r.badge.icon,
    earnedAt: r.earnedAt.toISOString(),
    courseId: r.courseId ?? undefined,
  }));
}

export async function getAllBadges(): Promise<Badge[]> {
  const rows = await prisma.badge.findMany({ orderBy: { createdAt: 'asc' } });
  return rows.map((b) => ({ id: b.id, name: b.name, description: b.description, category: b.category, icon: b.icon }));
}
