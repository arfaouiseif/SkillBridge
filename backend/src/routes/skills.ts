import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';

const querySchema = z.object({
  category: z
    .enum(['tech', 'design', 'languages', 'diy', 'daily_life', 'academic', 'music_arts', 'career'])
    .optional(),
  q: z.string().trim().optional(),
});

export const skillsRouter = Router();

skillsRouter.get('/', async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid query parameters' });
    return;
  }
  const { category, q } = parsed.data;

  const where: Prisma.SkillWhereInput = {};
  if (category) where.category = category;
  if (q) where.name = { contains: q, mode: 'insensitive' };

  const skills = await prisma.skill.findMany({ where, orderBy: { name: 'asc' } });
  res.json(skills);
});