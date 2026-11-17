import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { sessionInclude, toSessionResponse } from '../session';
import { toTunisTime } from '../time';
import { validationError } from '../validation';
import { requireAuth } from '../middleware/auth';

const createSessionSchema = z.object({
  teacherId: z.number().int(),
  skillId: z.number().int(),
  startAt: z.string().datetime({ offset: true }),
  durationMinutes: z.union([z.literal(30), z.literal(60), z.literal(90), z.literal(120)]),
  message: z.string().trim().max(300).nullable().optional(),
});

export const sessionsRouter = Router();

sessionsRouter.use(requireAuth);

sessionsRouter.post('/', async (req, res) => {
  const learnerId = res.locals.userId as number;

  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const { teacherId, skillId, durationMinutes, message } = parsed.data;
  const startAt = new Date(parsed.data.startAt);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

  // 1. Not with yourself
  if (teacherId === learnerId) {
    res.status(400).json({ message: 'You cannot book a session with yourself' });
    return;
  }

  // 2. The teacher exists
  const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { id: true } });
  if (!teacher) {
    res.status(404).json({ message: 'Teacher not found' });
    return;
  }

  // 3. The teacher teaches this skill
  const teaches = await prisma.userSkill.findUnique({
    where: { userId_skillId_type: { userId: teacherId, skillId, type: 'teach' } },
  });
  if (!teaches) {
    res.status(400).json({ message: 'This user does not teach this skill' });
    return;
  }

  // 4. In the future
  if (startAt.getTime() <= Date.now()) {
    res.status(400).json({ message: 'The session must start in the future' });
    return;
  }

  // 5. On the hour or half hour
  if (
    startAt.getUTCMinutes() % 30 !== 0 ||
    startAt.getUTCSeconds() !== 0 ||
    startAt.getUTCMilliseconds() !== 0
  ) {
    res.status(400).json({ message: 'The session must start on the hour or half hour' });
    return;
  }

  // 6. Entirely inside one of the teacher's weekly windows (Tunisia time)
  const { weekday, minuteOfDay } = toTunisTime(startAt);
  const endMinute = minuteOfDay + durationMinutes;
  const window = await prisma.availability.findFirst({
    where: {
      teacherId,
      weekday,
      startMinute: { lte: minuteOfDay },
      endMinute: { gte: endMinute },
    },
  });
  if (!window) {
    res.status(400).json({ message: "The slot is outside the teacher's availability" });
    return;
  }

  // 7. No accepted session overlapping, for the teacher or for me (in either role)
  const conflict = await prisma.session.findFirst({
    where: {
      status: 'accepted',
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      OR: [{ teacherId }, { learnerId: teacherId }, { teacherId: learnerId }, { learnerId }],
    },
  });
  if (conflict) {
    const teacherBusy = conflict.teacherId === teacherId || conflict.learnerId === teacherId;
    res.status(409).json({
      message: teacherBusy
        ? 'The teacher is not available at this time'
        : 'You already have a session at this time',
    });
    return;
  }

  // 8. I have not already requested this slot
  const duplicate = await prisma.session.findFirst({
    where: {
      status: 'pending',
      teacherId,
      learnerId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });
  if (duplicate) {
    res.status(409).json({ message: 'You already requested this slot' });
    return;
  }

  const session = await prisma.session.create({
    data: { teacherId, learnerId, skillId, startAt, endAt, message: message || null },
    include: sessionInclude,
  });

  res.status(201).json(toSessionResponse(session));
});