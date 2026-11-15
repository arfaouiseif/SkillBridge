import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { toHHMM, toMinutes } from '../time';
import { validationError } from '../validation';
import { requireAuth } from '../middleware/auth';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const availabilitySchema = z.object({
  windows: z
    .array(
      z.object({
        weekday: z.number().int().min(1).max(7),
        startTime: z.string().regex(timeRegex, 'Expected HH:MM'),
        endTime: z.string().regex(timeRegex, 'Expected HH:MM'),
      }),
    )
    .max(100),
});

type WindowRow = { weekday: number; startMinute: number; endMinute: number };

function toWindowsResponse(rows: WindowRow[]) {
  return rows.map((r) => ({
    weekday: r.weekday,
    startTime: toHHMM(r.startMinute),
    endTime: toHHMM(r.endMinute),
  }));
}

export const availabilityRouter = Router();

availabilityRouter.use(requireAuth);

// Replace my weekly availability
availabilityRouter.put('/me/availability', async (req, res) => {
  const userId = res.locals.userId as number;

  const parsed = availabilitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }

  const rows: WindowRow[] = parsed.data.windows.map((w) => ({
    weekday: w.weekday,
    startMinute: toMinutes(w.startTime),
    endMinute: toMinutes(w.endTime),
  }));

  // Each window must end after it starts
  if (rows.some((r) => r.endMinute <= r.startMinute)) {
    res.status(400).json({ message: 'Each window must end after it starts' });
    return;
  }

  // Windows of the same weekday must not overlap: sort them, then compare neighbours
  const sorted = [...rows].sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (previous.weekday === current.weekday && current.startMinute < previous.endMinute) {
      res.status(400).json({ message: 'Windows on the same weekday must not overlap' });
      return;
    }
  }

  // Delete the old windows and create the new ones, all or nothing
  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { teacherId: userId } }),
    prisma.availability.createMany({ data: sorted.map((r) => ({ ...r, teacherId: userId })) }),
  ]);

  res.json({ windows: toWindowsResponse(sorted) });
});

// A teacher's weekly windows and their busy slots
availabilityRouter.get('/:id/availability', async (req, res) => {
  const id = Number(req.params.id);
  const user = Number.isInteger(id)
    ? await prisma.user.findUnique({ where: { id }, select: { id: true } })
    : null;

  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days

  const [windows, sessions] = await Promise.all([
    prisma.availability.findMany({
      where: { teacherId: id },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
    }),
    prisma.session.findMany({
      where: {
        status: 'accepted',
        endAt: { gt: now },
        startAt: { lt: horizon },
        OR: [{ teacherId: id }, { learnerId: id }],
      },
      orderBy: { startAt: 'asc' },
      select: { startAt: true, endAt: true },
    }),
  ]);

  res.json({
    windows: toWindowsResponse(windows),
    busy: sessions.map((s) => ({
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
    })),
  });
});