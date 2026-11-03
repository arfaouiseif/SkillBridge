import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma';
import { signToken } from '../token';
import { toUserResponse, userInclude } from '../user';

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// Builds the 400 body described in openapi.yaml
function validationError(error: z.ZodError) {
  return {
    message: 'Invalid input',
    details: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: 'Email already used' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    include: userInclude,
  });

  res.status(201).json({ token: signToken(user.id), user: toUserResponse(user) });
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email }, include: userInclude });
  const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;

  // Same message whether the email or the password is wrong, so nobody can probe which emails exist
  if (!user || !passwordOk) {
    res.status(401).json({ message: 'Wrong email or password' });
    return;
  }

  res.json({ token: signToken(user.id), user: toUserResponse(user) });
});