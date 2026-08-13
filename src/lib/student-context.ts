import { prisma } from '@/lib/prisma';

export async function buildStudentContext(userId: string): Promise<string> {
  try {
    const contextParts: string[] = [];

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    if (user) contextParts.push(`You are talking to ${user.fullName}.`);

    const enrollments = await prisma.enrollment.findMany({
      where: { userId, status: 'active' },
      select: { course: { select: { title: true, subject: true } } },
      take: 10,
    });

    if (enrollments.length > 0) {
      const courses = enrollments.map((e) => e.course.title).join(', ');
      contextParts.push(`They are enrolled in: ${courses}.`);
    } else {
      contextParts.push('They are a learner with no active course enrollments yet.');
    }

    const payments = await prisma.payment
      .findMany({
        where: { userId },
        select: { status: true },
        take: 20,
      })
      .catch(() => []);

    const paid = payments.filter((p) => p.status === 'succeeded').length;
    if (paid > 0) contextParts.push(`They have ${paid} completed payment${paid === 1 ? '' : 's'} on their account.`);

    contextParts.push(
      `Use the student's name naturally. Adapt explanations to their level. Reference their enrolled courses and make learning personal and encouraging.`,
    );

    return contextParts.join('\n');
  } catch {
    return '';
  }
}