import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CourseSessionSeed {
  id: string;
  courseId: string;
  title: string;
  format: string;
  date: string;
  startTime: string;
  endTime: string;
  hostTimezone: string;
  instructorId: string;
  roomId?: string;
  meetingLink?: string;
  status: string;
  sessionType: string;
}

interface AssignmentSeed {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
  points: number;
}

async function main() {
  const byEmail = new Map<string, string>();
  const users = await prisma.user.findMany({ select: { id: true, email: true, fullName: true } });
  for (const u of users) byEmail.set(u.email.toLowerCase(), u.id);

  const instructorId = byEmail.get('instructor@emitcenter.com');
  const studentId = byEmail.get('student@emitcenter.com');
  const testId = byEmail.get('test@emitcenter.com');
  const adminId = byEmail.get('admin@emitcenter.com');
  if (!instructorId || !studentId || !testId) {
    throw new Error('Required seed users are missing. Run seed-all first.');
  }

  const courses = await prisma.course.findMany({ select: { id: true, title: true, instructorId: true } });

  const sessions: CourseSessionSeed[] = [
    { id: 'ses_0001', courseId: 'crs_0001', title: 'Intro to Arduino & Circuits', format: 'onsite', date: '2026-09-08T00:00:00.000Z', startTime: '16:00', endTime: '17:30', hostTimezone: 'America/New_York', instructorId, roomId: 'rm_0001', status: 'scheduled', sessionType: 'lecture' },
    { id: 'ses_0002', courseId: 'crs_0001', title: 'Building Your First Robot', format: 'onsite', date: '2026-09-10T00:00:00.000Z', startTime: '16:00', endTime: '17:30', hostTimezone: 'America/New_York', instructorId, roomId: 'rm_0001', status: 'scheduled', sessionType: 'lab' },
    { id: 'ses_0003', courseId: 'crs_0001', title: 'Motor Control Workshop', format: 'onsite', date: '2026-09-15T00:00:00.000Z', startTime: '16:00', endTime: '17:30', hostTimezone: 'America/New_York', instructorId, roomId: 'rm_0001', status: 'scheduled', sessionType: 'workshop' },
    { id: 'ses_0004', courseId: 'crs_0002', title: 'Python: Variables & Types', format: 'online', date: '2026-09-09T00:00:00.000Z', startTime: '10:00', endTime: '11:00', hostTimezone: 'Europe/London', instructorId, meetingLink: 'https://meet.emitcenter.com/python-101', status: 'scheduled', sessionType: 'lecture' },
    { id: 'ses_0005', courseId: 'crs_0002', title: 'Python: Functions Deep Dive', format: 'online', date: '2026-09-11T00:00:00.000Z', startTime: '10:00', endTime: '11:00', hostTimezone: 'Europe/London', instructorId, meetingLink: 'https://meet.emitcenter.com/python-101', status: 'scheduled', sessionType: 'lecture' },
    { id: 'ses_0006', courseId: 'crs_0004', title: 'Leadership & Communication', format: 'onsite', date: '2026-09-12T00:00:00.000Z', startTime: '09:00', endTime: '13:00', hostTimezone: 'America/New_York', instructorId, roomId: 'rm_0005', status: 'scheduled', sessionType: 'workshop' },
  ];

  for (const s of sessions) {
    await prisma.courseSession.upsert({
      where: { id: s.id },
      update: { title: s.title, status: s.status },
      create: {
        id: s.id, courseId: s.courseId, title: s.title, format: s.format,
        date: new Date(s.date), startTime: s.startTime, endTime: s.endTime,
        hostTimezone: s.hostTimezone, instructorId: s.instructorId,
        roomId: s.roomId, meetingLink: s.meetingLink, status: s.status, sessionType: s.sessionType,
      },
    });
  }

  for (const sessionId of ['ses_0001', 'ses_0002']) {
    for (const [userId, status] of [[studentId, 'present'], [testId, 'present']] as const) {
      await prisma.attendanceRecord.upsert({
        where: { sessionId_userId: { sessionId, userId } },
        update: { status },
        create: { sessionId, userId, status, checkInMethod: 'manual' },
      });
    }
  }

  const assignments: AssignmentSeed[] = [
    { id: 'asg_0001', courseId: 'crs_0001', title: 'Arduino Blink Lab Report', description: 'Document your blink circuit build: parts list, wiring diagram, code, and results.', dueDate: '2026-09-22T23:59:00.000Z', points: 100 },
    { id: 'asg_0002', courseId: 'crs_0001', title: 'Obstacle Avoidance Robot', description: 'Build and program a robot that avoids obstacles using an ultrasonic sensor.', dueDate: '2026-10-15T23:59:00.000Z', points: 150 },
    { id: 'asg_0003', courseId: 'crs_0002', title: 'Python: Fibonacci Script', description: 'Write a script that prints the Fibonacci sequence up to n terms, with input validation.', dueDate: '2026-09-25T23:59:00.000Z', points: 100 },
  ];

  for (const a of assignments) {
    await prisma.assignment.upsert({
      where: { id: a.id },
      update: { title: a.title },
      create: {
        id: a.id, courseId: a.courseId, title: a.title, description: a.description,
        dueDate: new Date(a.dueDate), points: a.points, allowedFormats: JSON.stringify(['pdf', 'doc', 'docx', 'zip']),
      },
    });
  }

  await prisma.submission.upsert({
    where: { assignmentId_userId: { assignmentId: 'asg_0001', userId: studentId } },
    update: { score: 92, status: 'graded', feedback: 'Excellent circuit documentation. Consider adding a schematic next time.' },
    create: {
      assignmentId: 'asg_0001', userId: studentId, fileName: 'arduino-blink-report.pdf', fileSize: 184320,
      score: 92, status: 'graded', letterGrade: 'A-', feedback: 'Excellent circuit documentation. Consider adding a schematic next time.',
      submittedAt: new Date('2026-09-19T18:30:00.000Z'),
    },
  });

  await prisma.gradebookEntry.upsert({
    where: { courseId_userId: { courseId: 'crs_0001', userId: studentId } },
    update: {},
    create: {
      courseId: 'crs_0001', userId: studentId,
      quizScoresJson: JSON.stringify([{ quizId: 'qz_0001', score: 72, total: 80 }]),
      assignmentScoresJson: JSON.stringify([{ assignmentId: 'asg_0001', score: 92, total: 100 }]),
      practicalScore: 95, overallPercentage: 91.3, letterGrade: 'A-',
    },
  });
  await prisma.gradebookEntry.upsert({
    where: { courseId_userId: { courseId: 'crs_0002', userId: studentId } },
    update: {},
    create: {
      courseId: 'crs_0002', userId: studentId,
      quizScoresJson: JSON.stringify([{ quizId: 'qz_0002', score: 63, total: 70 }]),
      assignmentScoresJson: JSON.stringify([]),
      practicalScore: 88, overallPercentage: 85.4, letterGrade: 'B+',
    },
  });

  for (const course of courses.filter((c) => c.id === 'crs_0001' || c.id === 'crs_0002')) {
    await prisma.announcement.upsert({
      where: { id: `ann_${course.id}` },
      update: { title: 'Welcome to the course!' },
      create: {
        id: `ann_${course.id}`, authorId: instructorId, courseId: course.id,
        title: 'Welcome to the course!',
        body: 'Welcome! Please review the syllabus, introduce yourself in discussions, and complete the first assignment.',
        pinned: true,
      },
    });
  }

  const notificationSeeds = [
    { id: 'not_0001', userId: studentId, type: 'enrollment', title: 'Enrolled in Robotics 101', body: 'Your enrollment in Robotics 101: Build Your First Robot is active.', actionUrl: '/courses/crs_0001' },
    { id: 'not_0002', userId: studentId, type: 'grade', title: 'New grade published', body: 'Your grade for "Arduino Blink Lab Report" was published (92%).', actionUrl: '/gradebook' },
    { id: 'not_0003', userId: studentId, type: 'announcement', title: 'New announcement', body: 'Welcome to the course! in Robotics 101', actionUrl: '/courses/crs_0001' },
    { id: 'not_0004', userId: testId, type: 'enrollment', title: 'Enrolled in Robotics 101', body: 'Your enrollment in Robotics 101: Build Your First Robot is active.', actionUrl: '/courses/crs_0001' },
    { id: 'not_0005', userId: adminId ?? testId, type: 'system', title: 'Platform ready', body: 'The EMIT Center LMS is ready for the new term.', actionUrl: '/dashboard/admin' },
  ];

  for (const n of notificationSeeds) {
    if (!n.userId) continue;
    await prisma.notification.upsert({
      where: { id: n.id },
      update: { body: n.body },
      create: { id: n.id, userId: n.userId, type: n.type, title: n.title, body: n.body, actionUrl: n.actionUrl },
    });
  }

  await prisma.directMessage.upsert({
    where: { id: 'msg_dm_0001' },
    update: { content: 'Alex, great work on the blink lab! For the obstacle robot, remember to test the sensor at different distances first.', isRead: true },
    create: {
      id: 'msg_dm_0001', senderId: instructorId, receiverId: studentId,
      subject: 'Re: Arduino Blink Lab Report',
      content: 'Alex, great work on the blink lab! For the obstacle robot, remember to test the sensor at different distances first.',
      isRead: true,
    },
  });
  await prisma.directMessage.upsert({
    where: { id: 'msg_dm_0002' },
    update: { content: 'Thank you! I will calibrate the sensor before the build.', isRead: false },
    create: {
      id: 'msg_dm_0002', senderId: studentId, receiverId: instructorId,
      subject: 'Re: Arduino Blink Lab Report',
      content: 'Thank you! I will calibrate the sensor before the build.',
      isRead: false,
    },
  });

  await prisma.certificate.upsert({
    where: { id: 'cert_0001' },
    update: { studentName: 'Alex Student' },
    create: {
      id: 'cert_0001', userId: studentId, courseId: 'crs_0001',
      studentName: 'Alex Student', courseTitle: 'Robotics 101: Build Your First Robot',
      completionDate: new Date('2026-12-15T00:00:00.000Z'),
      verificationHash: 'EMIT-ABCDEF123456',
      issuedAt: new Date('2026-12-15T00:00:00.000Z'),
    },
  });

  await prisma.parentStudentLink.upsert({
    where: { parentId_studentId: { parentId: byEmail.get('parent@emitcenter.com') ?? '', studentId } },
    update: { relationshipType: 'guardian' },
    create: { parentId: byEmail.get('parent@emitcenter.com') ?? '', studentId, relationshipType: 'guardian' },
  });

  console.log('Domain seed complete: sessions, attendance, assignments, submissions, gradebook, announcements, notifications, messages, certificates, parent links.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Done.');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
