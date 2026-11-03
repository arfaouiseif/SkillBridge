import { Router } from 'express';
import { prisma } from '../prisma';
import { toUserResponse, userInclude } from '../user';
import { requireAuth } from '../middleware/auth';

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