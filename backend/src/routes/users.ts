import { Router } from 'express';
import { prisma } from '../prisma';
import { toPublicUserResponse, toUserResponse , userInclude } from '../user';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod'
import { validationError } from '../validation';
import {Prisma } from '@prisma/client';


const updateProfileSchema = z.object({
  name: z.string().trim().min(2),
  bio : z.string().max(500).nullable().optional(),
  university: z.string().trim().nullable().optional(),
  year: z.number().int().min(1).max(10).nullable().optional(),
  city: z.string().trim().nullable().optional(),
  skills: z
    .array(
      z.object({
        skillId : z.number().int(),
        type: z.enum(['teach','learn']),
        level: z.enum(['beginner', 'intermediate','advanced']),
        mode : z.enum(['online','in_person','both'])
      }),
    )
    .optional(),

})

const searchSchema = z.object({
  skill: z.coerce.number().int().optional(),
  type: z.enum(['teach', 'learn']).default('teach'),
  category: z
    .enum(['tech', 'design', 'languages', 'diy', 'daily_life', 'academic', 'music_arts', 'career'])
    .optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  mode: z.enum(['online', 'in_person', 'both']).optional(),
  university: z.string().trim().optional(),
  city: z.string().trim().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});




export const usersRouter = Router();

// Every route in this router requires a valid token
usersRouter.use(requireAuth);

usersRouter.get('/me', async (_req, res) => {
  const userId = res.locals.userId as number;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });

  if (!user) {
    res.status(401).json({ message: 'User no longer exists' });
    return;
  }

  res.json(toUserResponse(user));
});


usersRouter.put('/me', async (req, res) => {
  const userId = res.locals.userId as number;

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const { name, bio, university, year, city, skills } = parsed.data;

  if (skills) {
    // The same skill can't appear twice with the same type (teach/learn)
    const keys = new Set(skills.map((s) => `${s.skillId}-${s.type}`));
    if (keys.size !== skills.length) {
      res.status(400).json({ message: 'Duplicate skill entries' });
      return;
    }

    // Every skillId must exist in the catalogue
    const ids = [...new Set(skills.map((s) => s.skillId))];
    const found = await prisma.skill.count({ where: { id: { in: ids } } });
    if (found !== ids.length) {
      res.status(400).json({ message: 'Unknown skillId' });
      return;
    }
  }

  // A transaction: either all the changes are saved, or none of them
  const user = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { name, bio, university, year, city },
    });

    if (skills) {
      await tx.userSkill.deleteMany({ where: { userId } });
      await tx.userSkill.createMany({ data: skills.map((s) => ({ ...s, userId })) });
    }

    return tx.user.findUniqueOrThrow({ where: { id: userId }, include: userInclude });
  });

  res.json(toUserResponse(user));
});

usersRouter.get('/', async (req, res) => {
  const userId = res.locals.userId as number;

  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const { skill, type, category, level, mode, university, city, q, page, pageSize } = parsed.data;

  // One skill entry must satisfy ALL the skill filters at once
  const skillFilter: Prisma.UserSkillWhereInput = { type };
  if (skill !== undefined) skillFilter.skillId = skill;
  if (category) skillFilter.skill = { category };
  if (level) skillFilter.level = level;
  if (mode) skillFilter.mode = mode;

  // Never return the signed-in user
  const where: Prisma.UserWhereInput = { id: { not: userId } };
  if (skill !== undefined || category || level || mode) {
    where.skills = { some: skillFilter };
  }
  if (university) where.university = { contains: university, mode: 'insensitive' };
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (q) where.name = { contains: q, mode: 'insensitive' };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: userInclude,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({ items: users.map(toPublicUserResponse), page, pageSize, total });
});

usersRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const user = Number.isInteger(id)
    ? await prisma.user.findUnique({ where: { id }, include: userInclude })
    : null;

  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.json(toPublicUserResponse(user));
});