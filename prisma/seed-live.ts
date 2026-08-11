import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  format: 'onsite' | 'online' | 'hybrid';
  ageLevel: 'elementary' | 'middle' | 'high' | 'adult' | 'all';
  subject: 'robotics' | 'coding' | 'design' | 'life_skills' | 'engineering' | 'career';
  days: string[];
  startTimeSlots: { start: string; end: string; timezone: string }[];
  startDate: string;
  endDate: string;
  onsiteLocation?: string;
  virtualLink?: string;
  maxSeats: number;
  enrolledCount: number;
  usdPrice: number;
}

const COURSES: SeedCourse[] = [
  {
    id: 'crs_0001',
    title: 'Robotics 101: Build Your First Robot',
    slug: 'robotics-101',
    description: 'Hands-on introduction to robotics engineering. Students will assemble, program, and test a working robot using Arduino microcontrollers, servo motors, and sensors.',
    format: 'onsite', ageLevel: 'middle', subject: 'robotics',
    days: ['Tuesday', 'Thursday'], startTimeSlots: [{ start: '16:00', end: '17:30', timezone: 'America/New_York' }],
    startDate: '2026-09-07T00:00:00.000Z', endDate: '2026-12-18T00:00:00.000Z',
    onsiteLocation: 'EMIT Center Lab A — 4517 Park Avenue, Bronx, NY',
    maxSeats: 16, enrolledCount: 11, usdPrice: 29900,
  },
  {
    id: 'crs_0002',
    title: 'Python Programming for Beginners',
    slug: 'python-beginners',
    description: 'Master Python fundamentals in a project-driven online course. Covers variables, control flow, functions, data structures, file I/O, and basic algorithm design.',
    format: 'online', ageLevel: 'high', subject: 'coding',
    days: ['Monday', 'Wednesday', 'Friday'], startTimeSlots: [{ start: '10:00', end: '11:00', timezone: 'Europe/London' }],
    startDate: '2026-09-09T00:00:00.000Z', endDate: '2026-12-18T00:00:00.000Z',
    virtualLink: 'https://meet.emitcenter.com/python-101',
    maxSeats: 30, enrolledCount: 22, usdPrice: 19900,
  },
  {
    id: 'crs_0003',
    title: '3D Modeling & Design Studio',
    slug: '3d-modeling-design',
    description: 'Learn professional 3D design using Blender and Fusion 360. Covers product design workflow from concept sketches to photorealistic renders and 3D-printable models.',
    format: 'online', ageLevel: 'all', subject: 'design',
    days: ['Thursday'], startTimeSlots: [{ start: '18:00', end: '20:00', timezone: 'Europe/London' }],
    startDate: '2026-09-17T00:00:00.000Z', endDate: '2026-12-18T00:00:00.000Z',
    virtualLink: 'https://meet.emitcenter.com/3d-studio',
    maxSeats: 20, enrolledCount: 14, usdPrice: 22900,
  },
  {
    id: 'crs_0004',
    title: 'Life Skills & Leadership Bootcamp',
    slug: 'life-skills-bootcamp',
    description: 'An intensive on-site program that builds confidence, communication, financial literacy, and leadership.',
    format: 'onsite', ageLevel: 'high', subject: 'life_skills',
    days: ['Saturday'], startTimeSlots: [{ start: '09:00', end: '13:00', timezone: 'America/New_York' }],
    startDate: '2026-09-12T00:00:00.000Z', endDate: '2026-11-21T00:00:00.000Z',
    onsiteLocation: 'EMIT Center Hall B — 4517 Park Avenue, Bronx, NY',
    maxSeats: 24, enrolledCount: 18, usdPrice: 24900,
  },
  {
    id: 'crs_0005',
    title: 'AI & Machine Learning Foundations',
    slug: 'ai-ml-foundations',
    description: 'Build a working understanding of machine learning. Covers supervised/unsupervised learning, model evaluation, and neural network fundamentals with hands-on labs.',
    format: 'hybrid', ageLevel: 'high', subject: 'engineering',
    days: ['Monday', 'Thursday'], startTimeSlots: [{ start: '19:00', end: '21:00', timezone: 'Europe/Berlin' }],
    startDate: '2026-09-07T00:00:00.000Z', endDate: '2026-12-17T00:00:00.000Z',
    onsiteLocation: 'EMIT Center Tech Hub — 4517 Park Avenue, Bronx, NY',
    virtualLink: 'https://meet.emitcenter.com/ai-ml-03',
    maxSeats: 20, enrolledCount: 16, usdPrice: 34900,
  },
  {
    id: 'crs_0006',
    title: 'Science Olympiad Prep',
    slug: 'science-olympiad-prep',
    description: 'Structured preparation for regional Science Olympiad competitions across physics, chemistry, biology, and engineering events.',
    format: 'onsite', ageLevel: 'middle', subject: 'engineering',
    days: ['Friday'], startTimeSlots: [{ start: '15:00', end: '17:00', timezone: 'America/New_York' }],
    startDate: '2026-09-18T00:00:00.000Z', endDate: '2026-12-18T00:00:00.000Z',
    onsiteLocation: 'EMIT Center Lab B — 4517 Park Avenue, Bronx, NY',
    maxSeats: 20, enrolledCount: 12, usdPrice: 24900,
  },
  {
    id: 'crs_0007',
    title: 'Web Development with React',
    slug: 'web-dev-react',
    description: 'Modern front-end web development with React, TypeScript, and Tailwind CSS. Students build and deploy a personal portfolio and a storefront SPA.',
    format: 'online', ageLevel: 'high', subject: 'coding',
    days: ['Tuesday'], startTimeSlots: [{ start: '19:30', end: '21:00', timezone: 'Europe/London' }],
    startDate: '2026-10-05T00:00:00.000Z', endDate: '2026-12-18T00:00:00.000Z',
    virtualLink: 'https://meet.emitcenter.com/web-dev-01',
    maxSeats: 24, enrolledCount: 15, usdPrice: 28900,
  },
  {
    id: 'crs_0008',
    title: 'LEGO Robotics Jr. (Ages 7-10)',
    slug: 'lego-robotics-jr',
    description: 'Young builders learn early engineering concepts using LEGO Education SPIKE Prime. Build and program robots with block-based coding.',
    format: 'onsite', ageLevel: 'elementary', subject: 'robotics',
    days: ['Saturday'], startTimeSlots: [{ start: '10:00', end: '12:00', timezone: 'America/New_York' }],
    startDate: '2026-09-05T00:00:00.000Z', endDate: '2026-12-19T00:00:00.000Z',
    onsiteLocation: 'EMIT Center Lab B — 4517 Park Avenue, Bronx, NY',
    maxSeats: 12, enrolledCount: 9, usdPrice: 14900,
  },
  {
    id: 'crs_0009',
    title: 'Digital Art & Character Design',
    slug: 'digital-art-character',
    description: 'Digital illustration techniques using Procreate and Photoshop: sketching, inking, cel shading, and character iteration.',
    format: 'online', ageLevel: 'all', subject: 'design',
    days: ['Thursday'], startTimeSlots: [{ start: '16:00', end: '18:00', timezone: 'Europe/Paris' }],
    startDate: '2026-10-07T00:00:00.000Z', endDate: '2026-12-16T00:00:00.000Z',
    virtualLink: 'https://meet.emitcenter.com/digital-art-01',
    maxSeats: 18, enrolledCount: 13, usdPrice: 19900,
  },
  {
    id: 'crs_0010',
    title: 'Career Exploration & Internship Prep',
    slug: 'career-exploration',
    description: 'Career readiness: resume building, interview practice, digital citizenship, and internships across STEM industries.',
    format: 'hybrid', ageLevel: 'adult', subject: 'career',
    days: ['Wednesday'], startTimeSlots: [{ start: '18:00', end: '20:00', timezone: 'America/New_York' }],
    startDate: '2026-09-09T00:00:00.000Z', endDate: '2026-12-16T00:00:00.000Z',
    virtualLink: 'https://meet.emitcenter.com/career-01',
    maxSeats: 20, enrolledCount: 11, usdPrice: 14900,
  },
];

const LIVE_SESSIONS = [
  { id: 'lvs_0001', courseId: 'crs_0001', title: 'Robotics 101 — Office Hours', platform: 'zoom', joinUrl: 'https://zoom.emitcenter.com/robotics-oh', hostKey: null, status: 'upcoming', scheduledStart: '2026-09-14T16:00:00.000Z', scheduledEnd: '2026-09-14T17:00:00.000Z', agenda: ['Q&A on Arduino setup', 'Circuit debugging help', 'Project milestone check-in'] },
  { id: 'lvs_0002', courseId: 'crs_0002', title: 'Python — Live Coding Session', platform: 'zoom', joinUrl: 'https://zoom.us/j/emit-python-live', hostKey: 'PY2026_EMIT', status: 'upcoming', scheduledStart: '2026-09-16T10:00:00.000Z', scheduledEnd: '2026-09-16T11:00:00.000Z', agenda: ['Live code review', 'Functions deep dive', 'Q&A session'] },
  { id: 'lvs_0003', courseId: 'crs_0005', title: 'AI/ML — Guest Lecture', platform: 'google_meet', joinUrl: 'https://meet.google.com/emit-ai-guest', hostKey: null, status: 'upcoming', scheduledStart: '2026-09-17T19:00:00.000Z', scheduledEnd: '2026-09-17T20:30:00.000Z', agenda: ['Guest: Dr. Chen from MIT', 'Real-world ML applications', 'Career paths in AI'] },
  { id: 'lvs_0004', courseId: 'crs_0007', title: 'Web Dev — Component Clinic', platform: 'jitsi', joinUrl: 'https://meet.jit.si/emit-webdev-clinic', hostKey: null, status: 'upcoming', scheduledStart: '2026-10-06T19:30:00.000Z', scheduledEnd: '2026-10-06T21:00:00.000Z', agenda: ['React hooks review', 'Styling patterns', 'Deploy workflow'] },
];

const CHAT_MESSAGES = [
  { id: 'msg_0001', sessionId: 'lvs_0001', userId: null, userName: 'Dr. Samuel Okafor', content: 'Welcome everyone! Please post any questions about the Arduino setup here.', timestamp: '2026-09-14T16:02:00.000Z' },
  { id: 'msg_0002', sessionId: 'lvs_0001', userId: null, userName: 'Liam Chen', content: 'My LED isn\'t blinking — do I have the resistor orientation right?', timestamp: '2026-09-14T16:05:00.000Z' },
  { id: 'msg_0003', sessionId: 'lvs_0001', userName: 'Sarah Instructor', content: 'Great question! The longer leg of the LED should connect to pin 13, and the resistor goes between the short leg and GND.', timestamp: '2026-09-14T16:06:00.000Z' },
  { id: 'msg_0004', sessionId: 'lvs_0001', userId: null, userName: 'Jean-Luc Moreau', content: 'Thanks, working now! Merci!', timestamp: '2026-09-14T16:08:00.000Z' },
];

const QUIZZES = [
  {
    id: 'qz_0001', courseId: 'crs_0001', title: 'Basic Electronics Quiz', description: 'Test your knowledge of circuits, voltage, current, and Arduino components.', timeLimit: 15, totalPoints: 80, isPublished: true,
    questions: [
      { id: 'q_0001', question: 'What does LED stand for?', type: 'multiple-choice', options: ['Light Emitting Diode', 'Low Energy Device', 'Laser Emitting Diode', 'Long Electronic Drive'], correctAnswer: 'Light Emitting Diode', points: 10, required: true },
      { id: 'q_0002', question: 'What is the purpose of a resistor in a circuit?', type: 'multiple-choice', options: ['To store electrical energy', 'To limit current flow', 'To amplify signals', 'To convert AC to DC'], correctAnswer: 'To limit current flow', points: 10, required: true },
      { id: 'q_0003', question: 'Explain how you would connect an LED to an Arduino pin.', type: 'short-answer', points: 20, required: true },
      { id: 'q_0004', question: 'Upload a photo of your completed breadboard circuit.', type: 'file-upload', points: 30, required: false },
      { id: 'q_0005', question: 'What voltage does most Arduino boards operate at?', type: 'multiple-choice', options: ['3.3V', '5V', '12V', '1.5V'], correctAnswer: '5V', points: 10, required: true },
    ],
  },
  {
    id: 'qz_0002', courseId: 'crs_0002', title: 'Python Fundamentals Quiz', description: 'Cover variables, data types, control flow, and functions.', timeLimit: 20, totalPoints: 70, isPublished: true,
    questions: [
      { id: 'q_0006', question: 'Which keyword is used to define a function in Python?', type: 'multiple-choice', options: ['func', 'def', 'function', 'define'], correctAnswer: 'def', points: 10, required: true },
      { id: 'q_0007', question: 'What will print(2 ** 3) output?', type: 'multiple-choice', options: ['6', '8', '9', '5'], correctAnswer: '8', points: 10, required: true },
      { id: 'q_0008', question: 'Explain the difference between a list and a tuple in Python.', type: 'short-answer', points: 20, required: true },
      { id: 'q_0009', question: 'Submit a Python script that calculates the Fibonacci sequence up to n terms.', type: 'file-upload', points: 30, required: true },
    ],
  },
];

const THREADS = [
  { id: 'thr_0001', courseId: 'crs_0001', unitId: 'sec_0002', title: 'Arduino setup troubleshooting thread', content: 'Share your setup issues here. What error messages are you seeing when uploading to the Arduino board? Let us help each other!', authorId: null, isPinned: true, isEndorsed: true, isLocked: false, replyCount: 4, viewCount: 128, createdAt: '2026-09-08T10:00:00.000Z', updatedAt: '2026-09-09T14:00:00.000Z', lastReplyAt: '2026-09-09T14:00:00.000Z', authorEmail: 'instructor@emitcenter.com' },
  { id: 'thr_0002', courseId: 'crs_0001', unitId: 'sec_0003', title: 'Show us your first LED circuit!', content: 'Post a picture or video of your working circuit. What resistor value did you use? Did you try different colors?', authorId: null, isPinned: false, isEndorsed: true, isLocked: false, replyCount: 3, viewCount: 95, createdAt: '2026-09-10T14:00:00.000Z', updatedAt: '2026-09-12T09:00:00.000Z', lastReplyAt: '2026-09-12T09:00:00.000Z', authorEmail: 'instructor@emitcenter.com' },
  { id: 'thr_0003', courseId: 'crs_0001', unitId: 'sec_0003', title: 'Best resistor for green vs blue LED?', content: 'I noticed my blue LED is dimmer than the green one with the same resistor. What resistance should I use for each color?', authorId: null, isPinned: false, isEndorsed: false, isLocked: false, replyCount: 2, viewCount: 56, createdAt: '2026-09-11T16:30:00.000Z', updatedAt: '2026-09-12T08:00:00.000Z', lastReplyAt: '2026-09-12T08:00:00.000Z', authorEmail: 'student@emitcenter.com' },
  { id: 'thr_0004', courseId: 'crs_0002', title: 'Python list comprehension tricks', content: 'Share your favorite one-liners and list comprehension patterns. What is the most elegant solution you have found?', authorId: null, isPinned: true, isEndorsed: true, isLocked: false, replyCount: 2, viewCount: 78, createdAt: '2026-09-12T11:00:00.000Z', updatedAt: '2026-09-14T16:00:00.000Z', lastReplyAt: '2026-09-14T16:00:00.000Z', authorEmail: 'instructor@emitcenter.com' },
];

const REPLIES = [
  { id: 'rpl_0001', threadId: 'thr_0001', content: 'I keep getting "avrdude: stk500_getsync(): not in sync" — make sure you selected the right board and port in Tools menu!', isModeratorReply: true, isEndorsed: true, createdAt: '2026-09-08T11:00:00.000Z', authorEmail: 'instructor@emitcenter.com' },
  { id: 'rpl_0002', threadId: 'thr_0001', content: 'Also check that nothing is connected to pin 0 or 1 while uploading. Those are the TX/RX pins and interfere with the upload process.', isModeratorReply: true, isEndorsed: true, createdAt: '2026-09-08T11:05:00.000Z', authorEmail: 'instructor@emitcenter.com' },
  { id: 'rpl_0003', threadId: 'thr_0001', content: 'That fixed it! I had selected the wrong COM port. Thank you Dr. Okafor!', isModeratorReply: false, isEndorsed: false, createdAt: '2026-09-09T09:30:00.000Z', authorEmail: 'student@emitcenter.com' },
  { id: 'rpl_0004', threadId: 'thr_0001', content: 'Same issue here — switching to the correct board model in the IDE solved it. Great tip.', isModeratorReply: false, isEndorsed: false, createdAt: '2026-09-09T14:00:00.000Z', authorEmail: 'test@emitcenter.com' },
  { id: 'rpl_0005', threadId: 'thr_0002', content: 'Here is mine! Used a 220Ω resistor with a red LED on pin 13. Works perfectly.', isModeratorReply: false, isEndorsed: false, createdAt: '2026-09-10T15:00:00.000Z', authorEmail: 'student@emitcenter.com' },
  { id: 'rpl_0006', threadId: 'thr_0002', content: 'Excellent work! That is exactly the right setup. For anyone using a blue or white LED, try 100Ω instead — they have a higher forward voltage.', isModeratorReply: true, isEndorsed: true, createdAt: '2026-09-11T08:30:00.000Z', authorEmail: 'instructor@emitcenter.com' },
  { id: 'rpl_0007', threadId: 'thr_0002', content: 'I used a 100Ω with my blue LED and it is much brighter now. Thanks for the tip!', isModeratorReply: false, isEndorsed: false, createdAt: '2026-09-12T09:00:00.000Z', authorEmail: 'test@emitcenter.com' },
  { id: 'rpl_0008', threadId: 'thr_0003', content: 'Blue LEDs typically have a forward voltage around 3.2V compared to ~2.0V for red. Use 100Ω for blue and 220Ω for red with a 5V Arduino.', isModeratorReply: true, isEndorsed: true, createdAt: '2026-09-12T08:00:00.000Z', authorEmail: 'instructor@emitcenter.com' },
  { id: 'rpl_0009', threadId: 'thr_0004', content: 'My favorite: [x*2 for x in range(10) if x%2==0] — generates even numbers doubled.', isModeratorReply: true, isEndorsed: true, createdAt: '2026-09-12T11:30:00.000Z', authorEmail: 'instructor@emitcenter.com' },
  { id: 'rpl_0010', threadId: 'thr_0004', content: 'I love using dict comprehension for quick lookups: {w: len(w) for w in sentence.split()} — maps each word to its length.', isModeratorReply: false, isEndorsed: false, createdAt: '2026-09-14T16:00:00.000Z', authorEmail: 'student@emitcenter.com' },
];

const ROOMS = [
  { id: 'rm_0001', name: 'Lab A — Robotics', building: 'Main Campus', floor: 1, capacity: 16, amenities: ['Workbenches', 'Soldering Stations', 'Projector', 'Sink'], status: 'open' },
  { id: 'rm_0002', name: 'Lab B — Junior Makerspace', building: 'Main Campus', floor: 1, capacity: 12, amenities: ['LEGO Kits', '3D Printer', 'Whiteboard Wall', 'Sink'], status: 'open' },
  { id: 'rm_0003', name: 'Tech Hub — Coding Lab', building: 'Main Campus', floor: 2, capacity: 24, amenities: ['Desktop PCs', 'Dual Monitors', 'Smart Board', 'Green Screen'], status: 'open' },
  { id: 'rm_0004', name: 'Design Studio', building: 'Main Campus', floor: 2, capacity: 18, amenities: ['Drawing Tablets', 'Light Boxes', 'Plotter Printer', 'Color Calibrated Displays'], status: 'open' },
  { id: 'rm_0005', name: 'Hall B — Multipurpose', building: 'Main Campus', floor: 1, capacity: 40, amenities: ['Stage', 'PA System', 'Projector', 'Modular Seating'], status: 'open' },
  { id: 'rm_0006', name: 'Conference Room A', building: 'Main Campus', floor: 2, capacity: 10, amenities: ['Video Conferencing', 'Whiteboard', 'Conference Phone'], status: 'open' },
];

const RESOURCES = [
  { id: 'res_0001', name: 'LEGO SPIKE Prime Kit', type: 'robotics_kit', quantity: 12, available: 10, status: 'available', location: 'Lab B' },
  { id: 'res_0002', name: 'Arduino Starter Bundle', type: 'robotics_kit', quantity: 16, available: 5, status: 'available', location: 'Lab A' },
  { id: 'res_0003', name: 'Dell Latitude Laptop', type: 'laptop', quantity: 24, available: 20, status: 'available', location: 'Tech Hub' },
  { id: 'res_0004', name: 'MacBook Pro (M4)', type: 'laptop', quantity: 8, available: 3, status: 'available', location: 'Design Studio' },
  { id: 'res_0005', name: 'Wacom Intuos Tablet', type: 'lab_equipment', quantity: 18, available: 14, status: 'available', location: 'Design Studio' },
  { id: 'res_0006', name: 'Digital Microscope Kit', type: 'microscope', quantity: 6, available: 4, status: 'available', location: 'Lab A' },
  { id: 'res_0007', name: 'Ultimaker S5 3D Printer', type: '3d_printer', quantity: 2, available: 1, status: 'available', location: 'Lab B' },
  { id: 'res_0008', name: 'Ozobot Classroom Pack', type: 'robotics_kit', quantity: 8, available: 6, status: 'available', location: 'Lab B' },
];

async function main() {
  const byEmail = new Map<string, string>();
  const users = await prisma.user.findMany({ select: { id: true, email: true, fullName: true } });
  for (const u of users) byEmail.set(u.email.toLowerCase(), u.id);
  const names = new Map(users.map((u) => [u.id, u.fullName]));

  for (const c of COURSES) {
    const instructor = byEmail.get('instructor@emitcenter.com');
    if (!instructor) throw new Error('instructor user missing');
    const scheduleJson = JSON.stringify({ days: c.days, startDate: c.startDate, endDate: c.endDate, timeSlots: c.startTimeSlots });
    await prisma.course.upsert({
      where: { id: c.id },
      update: { title: c.title, description: c.description, format: c.format, ageLevel: c.ageLevel, subject: c.subject, scheduleJson, instructorId: instructor, isPublished: true },
      create: {
        id: c.id, title: c.title, slug: c.slug, description: c.description, format: c.format, ageLevel: c.ageLevel, subject: c.subject,
        scheduleJson, onsiteLocation: c.onsiteLocation, virtualLink: c.virtualLink, maxSeats: c.maxSeats, enrolledCount: c.enrolledCount,
        instructorId: instructor, isPublished: true,
      },
    });
    await prisma.coursePrice.upsert({
      where: { id: `prc_${c.id}` },
      update: { amount: c.usdPrice },
      create: { id: `prc_${c.id}`, courseId: c.id, currency: 'USD', amount: c.usdPrice },
    });
  }

  const student = byEmail.get('student@emitcenter.com');
  const test = byEmail.get('test@emitcenter.com');
  if (student && test) {
    const enrs: { userId: string; courseId: string; status: 'active' | 'pending' | 'completed' }[] = [
      { userId: student, courseId: 'crs_0001', status: 'active' },
      { userId: student, courseId: 'crs_0002', status: 'active' },
      { userId: test, courseId: 'crs_0001', status: 'active' },
    ];
    for (const e of enrs) {
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: e.userId, courseId: e.courseId } },
        update: { status: e.status },
        create: { userId: e.userId, courseId: e.courseId, status: e.status },
      });
    }
  }

  for (const s of LIVE_SESSIONS) {
    await prisma.liveSession.upsert({
      where: { id: s.id },
      update: { title: s.title, platform: s.platform, joinUrl: s.joinUrl, hostKey: s.hostKey, status: s.status, scheduledStart: new Date(s.scheduledStart), scheduledEnd: new Date(s.scheduledEnd), agendaJson: JSON.stringify(s.agenda) },
      create: { id: s.id, courseId: s.courseId, title: s.title, platform: s.platform, joinUrl: s.joinUrl, hostKey: s.hostKey, status: s.status, scheduledStart: new Date(s.scheduledStart), scheduledEnd: new Date(s.scheduledEnd), agendaJson: JSON.stringify(s.agenda) },
    });
  }

  const instructorId = byEmail.get('instructor@emitcenter.com');
  if (!instructorId) throw new Error('instructor user missing');

  for (const m of CHAT_MESSAGES) {
    await prisma.chatMessage.upsert({
      where: { id: m.id },
      update: { content: m.content, userName: m.userName },
      create: {
        id: m.id,
        sessionId: m.sessionId,
        userId: m.userId ?? instructorId,
        userName: m.userName,
        content: m.content,
        timestamp: new Date(m.timestamp),
      },
    });
  }

  for (const q of QUIZZES) {
    await prisma.quiz.upsert({
      where: { id: q.id },
      update: { questionsJson: JSON.stringify(q.questions), totalPoints: q.totalPoints, timeLimit: q.timeLimit },
      create: { id: q.id, courseId: q.courseId, title: q.title, description: q.description, timeLimit: q.timeLimit, questionsJson: JSON.stringify(q.questions), totalPoints: q.totalPoints, isPublished: q.isPublished },
    });
  }

  for (const t of THREADS) {
    const authorId = byEmail.get(t.authorEmail) ?? null;
    if (!authorId) throw new Error(`author missing for ${t.authorEmail}`);
    await prisma.discussionThread.upsert({
      where: { id: t.id },
      update: { title: t.title, content: t.content, isPinned: t.isPinned, isEndorsed: t.isEndorsed, isLocked: t.isLocked, replyCount: t.replyCount, viewCount: t.viewCount },
      create: { id: t.id, courseId: t.courseId, unitId: t.unitId, title: t.title, content: t.content, authorId, isPinned: t.isPinned, isEndorsed: t.isEndorsed, isLocked: t.isLocked, replyCount: t.replyCount, viewCount: t.viewCount, createdAt: new Date(t.createdAt), updatedAt: new Date(t.updatedAt), lastReplyAt: t.lastReplyAt ? new Date(t.lastReplyAt) : null },
    });
  }

  for (const r of REPLIES) {
    const authorId = byEmail.get(r.authorEmail) ?? null;
    if (!authorId) throw new Error(`author missing for ${r.authorEmail}`);
    await prisma.discussionReply.upsert({
      where: { id: r.id },
      update: { content: r.content, isModeratorReply: r.isModeratorReply, isEndorsed: r.isEndorsed },
      create: { id: r.id, threadId: r.threadId, content: r.content, authorId, isModeratorReply: r.isModeratorReply, isEndorsed: r.isEndorsed, createdAt: new Date(r.createdAt) },
    });
  }

  for (const room of ROOMS) {
    await prisma.facilityRoom.upsert({
      where: { id: room.id },
      update: { name: room.name, building: room.building, floor: room.floor, capacity: room.capacity, amenities: JSON.stringify(room.amenities), status: room.status },
      create: { id: room.id, name: room.name, building: room.building, floor: room.floor, capacity: room.capacity, amenities: JSON.stringify(room.amenities), status: room.status },
    });
  }

  for (const res of RESOURCES) {
    await prisma.resourceItem.upsert({
      where: { id: res.id },
      update: { name: res.name, status: res.status },
      create: { id: res.id, name: res.name, type: res.type, quantity: res.quantity, available: res.available, status: res.status, location: res.location },
    });
  }

  const bookings = [
    { id: 'bok_0001', resourceId: 'res_0002', roomId: 'rm_0001', userId: byEmail.get('instructor@emitcenter.com'), courseId: 'crs_0001', startDate: '2026-09-01T00:00:00.000Z', endDate: '2026-12-20T00:00:00.000Z' },
    { id: 'bok_0002', resourceId: 'res_0005', roomId: 'rm_0004', userId: byEmail.get('instructor@emitcenter.com'), courseId: 'crs_0009', startDate: '2026-10-01T00:00:00.000Z', endDate: '2026-12-16T00:00:00.000Z' },
  ];
  for (const b of bookings) {
    if (!b.userId) throw new Error('booking author missing');
    await prisma.resourceBooking.upsert({
      where: { id: b.id },
      update: { startDate: new Date(b.startDate), endDate: new Date(b.endDate) },
      create: { id: b.id, resourceId: b.resourceId, roomId: b.roomId, userId: b.userId, courseId: b.courseId, startDate: new Date(b.startDate), endDate: new Date(b.endDate), status: 'active' },
    });
  }

  console.log('Live-domain seed complete: courses, live sessions, chat, quizzes, threads/replies, rooms, resources, bookings.');
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