import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { loadSummaries, otherParticipantId, pairKey } from '../chat';
import { toMessageResponse } from '../message';
import { prisma } from '../prisma';
import { validationError } from '../validation';
import { requireAuth } from '../middleware/auth';
import { emitToUser } from '../socket';


const createConversationSchema = z.object({ userId: z.number().int() });
const sendMessageSchema = z.object({ body: z.string().trim().min(1).max(2000) });
const historyQuerySchema = z.object({
  before: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);

// A conversation, only if I am one of its two participants
async function findMyConversation(id: number, userId: number) {
  if (!Number.isInteger(id)) return null;
  return prisma.conversation.findFirst({
    where: { id, OR: [{ userAId: userId }, { userBId: userId }] },
  });
}

// Finds the conversation of a pair, or creates it
async function getOrCreateConversation(key: { userAId: number; userBId: number }) {
  const existing = await prisma.conversation.findUnique({
    where: { userAId_userBId: key },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  try {
    const created = await prisma.conversation.create({ data: key, select: { id: true } });
    return { id: created.id, created: true };
  } catch (error) {
    // Two requests created it at the same time: the database refused the duplicate (P2002)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await prisma.conversation.findUniqueOrThrow({
        where: { userAId_userBId: key },
        select: { id: true },
      });
      return { id: raced.id, created: false };
    }
    throw error;
  }
}

// Start (or reopen) a conversation
conversationsRouter.post('/', async (req, res) => {
  const userId = res.locals.userId as number;

  const parsed = createConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const otherId = parsed.data.userId;

  if (otherId === userId) {
    res.status(400).json({ message: 'You cannot start a conversation with yourself' });
    return;
  }

  const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true } });
  if (!other) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const { id, created } = await getOrCreateConversation(pairKey(userId, otherId));
  const [summary] = await loadSummaries(userId, { id });

  res.status(created ? 201 : 200).json(summary);
});

// My conversations
conversationsRouter.get('/', async (_req, res) => {
  const userId = res.locals.userId as number;
  res.json(await loadSummaries(userId));
});

// Total unread messages, for the navbar badge
conversationsRouter.get('/unread-count', async (_req, res) => {
  const userId = res.locals.userId as number;
  const count = await prisma.message.count({
    where: {
      senderId: { not: userId },
      readAt: null,
      conversation: { OR: [{ userAId: userId }, { userBId: userId }] },
    },
  });
  res.json({ count });
});

// History of a conversation, oldest first
conversationsRouter.get('/:id/messages', async (req, res) => {
  const userId = res.locals.userId as number;

  const conversation = await findMyConversation(Number(req.params.id), userId);
  if (!conversation) {
    res.status(404).json({ message: 'Conversation not found' });
    return;
  }

  const parsed = historyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const { before, limit } = parsed.data;

  const where: Prisma.MessageWhereInput = { conversationId: conversation.id };
  if (before !== undefined) where.id = { lt: before };

  // Newest first to take the latest N, then reversed to read oldest first
  const messages = await prisma.message.findMany({ where, orderBy: { id: 'desc' }, take: limit });
  res.json(messages.reverse().map(toMessageResponse));
});

// Send a message
conversationsRouter.post('/:id/messages', async (req, res) => {
  const userId = res.locals.userId as number;

  const conversation = await findMyConversation(Number(req.params.id), userId);
  if (!conversation) {
    res.status(404).json({ message: 'Conversation not found' });
    return;
  }

  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }

  // Save the message and move the conversation to the top of the list, together
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: conversation.id, senderId: userId, body: parsed.data.body },
    }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    }),
  ]);

    const payload = toMessageResponse(message);

  // Push the message live to both participants (every tab they have open)
  emitToUser(otherParticipantId(conversation, userId), 'message:new', payload);
  emitToUser(userId, 'message:new', payload);

  res.status(201).json(payload);
});

// Mark the messages I received as read
conversationsRouter.post('/:id/read', async (req, res) => {
  const userId = res.locals.userId as number;

  const conversation = await findMyConversation(Number(req.params.id), userId);
  if (!conversation) {
    res.status(404).json({ message: 'Conversation not found' });
    return;
  }

  const readAt = new Date();
  const result = await prisma.message.updateMany({
    where: { conversationId: conversation.id, senderId: { not: userId }, readAt: null },
    data: { readAt },
  });

  // Tell the sender their messages were read
  if (result.count > 0) {
    emitToUser(otherParticipantId(conversation, userId), 'messages:read', {
      conversationId: conversation.id,
      readerId: userId,
      readAt: readAt.toISOString(),
    });
  }

  // Next step: push the `messages:read` event to the other participant here

  res.json({ updated: result.count });
});