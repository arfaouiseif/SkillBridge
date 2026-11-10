import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { computeScore } from '../matching';
import { toPublicUserResponse, userInclude } from '../user';
import { validationError } from '../validation';
import { requireAuth } from '../middleware/auth';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const matchesRouter = Router();

matchesRouter.use(requireAuth);

matchesRouter.get('/', async (req, res) => {
  const userId = res.locals.userId as number;

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const { limit } = parsed.data;

  // 1. My own skills
  const mySkills = await prisma.userSkill.findMany({ where: { userId } });
  const myTeach = new Set(mySkills.filter((s) => s.type === 'teach').map((s) => s.skillId));
  const myLearn = new Set(mySkills.filter((s) => s.type === 'learn').map((s) => s.skillId));

  // 2. Users who overlap with me in at least one direction
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: userId },
      OR: [
        { skills: { some: { type: 'teach', skillId: { in: [...myLearn] } } } },
        { skills: { some: { type: 'learn', skillId: { in: [...myTeach] } } } },
      ],
    },
    include: userInclude,
  });

  // 3. Count the overlaps and compute the score
  const matches = candidates.map((candidate) => {
    const theyTeachMe = candidate.skills
      .filter((s) => s.type === 'teach' && myLearn.has(s.skillId))
      .map((s) => s.skill);
    const iTeachThem = candidate.skills
      .filter((s) => s.type === 'learn' && myTeach.has(s.skillId))
      .map((s) => s.skill);

    return {
      user: toPublicUserResponse(candidate),
      score: computeScore(theyTeachMe.length, myLearn.size, iTeachThem.length, myTeach.size),
      theyTeachMe,
      iTeachThem,
    };
  });

  // 4. Best score first (ties sorted by name so the order is stable)
  matches.sort((a, b) => b.score - a.score || a.user.name.localeCompare(b.user.name));

  res.json(matches.slice(0, limit));
});