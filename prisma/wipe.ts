import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.chatMessage.deleteMany(),
    prisma.resourceBooking.deleteMany(),
    prisma.quizAttempt.deleteMany(),
    prisma.discussionReply.deleteMany(),
    prisma.discussionThread.deleteMany(),
    prisma.liveSession.deleteMany(),
    prisma.quiz.deleteMany(),
    prisma.lessonContent.deleteMany(),
    prisma.lessonSection.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.gradebookEntry.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.courseSession.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.certificate.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.coursePrice.deleteMany(),
    prisma.course.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.directMessage.deleteMany(),
    prisma.parentStudentLink.deleteMany(),
    prisma.ferpaAccessLog.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.consentRecord.deleteMany(),
    prisma.dataExportRequest.deleteMany(),
    prisma.accountDeletionRequest.deleteMany(),
    prisma.resourceItem.deleteMany(),
    prisma.facilityRoom.deleteMany(),
  ]);

  const users = await prisma.user.count();
  console.log(`domain wipe complete; users remaining: ${users}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());