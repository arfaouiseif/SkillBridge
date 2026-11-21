import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { sessionInclude, toSessionResponse } from '../session';
import { toTunisTime } from '../time';
import { validationError } from '../validation';
import { requireAuth } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const createSessionSchema = z.object({
  teacherId: z.number().int(),
  skillId: z.number().int(),
  startAt: z.string().datetime({ offset: true }),
  durationMinutes: z.union([z.literal(30), z.literal(60), z.literal(90), z.literal(120)]),
  message: z.string().trim().max(300).nullable().optional(),
});
const listQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'declined', 'completed', 'cancelled']).optional(),
  role: z.enum(['teacher', 'learner']).optional(),
  when: z.enum(['upcoming', 'past']).optional(),
});

const statusSchema = z.object({
  status: z.enum(['accepted', 'declined', 'cancelled', 'completed']),
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

// My sessions, as teacher or learner
sessionsRouter.get('/', async (req, res) => {
  const userId = res.locals.userId as number;

  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const { status, role, when } = parsed.data;

  const where: Prisma.SessionWhereInput = {};
  if (role === 'teacher') where.teacherId = userId;
  else if (role === 'learner') where.learnerId = userId;
  else where.OR = [{ teacherId: userId }, { learnerId: userId }];

  if (status) where.status = status;

  const now = new Date();
  if (when === 'upcoming') where.endAt = { gt: now };
  if (when === 'past') where.endAt = { lte: now };

  const sessions = await prisma.session.findMany({
    where,
    include: sessionInclude,
    orderBy: { startAt: when === 'upcoming' ? 'asc' : 'desc' },
  });

  res.json(sessions.map(toSessionResponse));
});

// Accept, decline, cancel or complete a session
sessionsRouter.patch('/:id/status', async (req, res) => {
  const userId = res.locals.userId as number;
  const id = Number(req.params.id);

  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const { status } = parsed.data;

  const session = Number.isInteger(id) ? await prisma.session.findUnique({ where: { id } }) : null;

  // A session you are not part of looks like it does not exist
  if (!session || (session.teacherId !== userId && session.learnerId !== userId)) {
    res.status(404).json({ message: 'Session not found' });
    return;
  }

  const isTeacher = session.teacherId === userId;
  const now = new Date();

  // The rules from docs/openapi.yaml
  if (status === 'accepted' || status === 'declined') {
    if (!isTeacher) {
      res.status(403).json({ message: 'Only the teacher can accept or decline a session' });
      return;
    }
    if (session.status !== 'pending') {
      res.status(409).json({ message: 'Only a pending session can be accepted or declined' });
      return;
    }
  } else if (status === 'cancelled') {
    if (session.status !== 'pending' && session.status !== 'accepted') {
      res.status(409).json({ message: 'Only a pending or accepted session can be cancelled' });
      return;
    }
    if (session.startAt <= now) {
      res.status(409).json({ message: 'A session that has started cannot be cancelled' });
      return;
    }
  } else {
    // completed
    if (session.status !== 'accepted') {
      res.status(409).json({ message: 'Only an accepted session can be completed' });
      return;
    }
    if (session.endAt > now) {
      res.status(409).json({ message: 'The session has not ended yet' });
      return;
    }
  }

  // Everything except "accepted" is a plain update
  if (status !== 'accepted') {
    const updated = await prisma.session.update({
      where: { id },
      data: { status },
      include: sessionInclude,
    });
    res.json(toSessionResponse(updated));
    return;
  }

  // Accepting: check conflicts and save in one locked transaction
  const result = await prisma.$transaction(async (tx) => {
    // Lock both people, smallest id first, so two requests can never wait on each other forever
    const [first, second] = [session.teacherId, session.learnerId].sort((a, b) => a - b);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${first}::bigint)`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${second}::bigint)`;

    // Re-read the session now that we hold the locks: it may have changed meanwhile
    const fresh = await tx.session.findUnique({ where: { id } });
    if (!fresh || fresh.status !== 'pending') return 'not-pending' as const;

    // Any accepted session overlapping this one, for the teacher or the learner
    const conflict = await tx.session.findFirst({
      where: {
        id: { not: id },
        status: 'accepted',
        startAt: { lt: fresh.endAt },
        endAt: { gt: fresh.startAt },
        OR: [
          { teacherId: first },
          { learnerId: first },
          { teacherId: second },
          { learnerId: second },
        ],
      },
    });
    if (conflict) return 'conflict' as const;

    return tx.session.update({
      where: { id },
      data: { status: 'accepted' },
      include: sessionInclude,
    });
  });

  if (result === 'not-pending') {
    res.status(409).json({ message: 'Only a pending session can be accepted or declined' });
    return;
  }
  if (result === 'conflict') {
    res.status(409).json({ message: 'Another accepted session overlaps this time' });
    return;
  }

  res.json(toSessionResponse(result));
});