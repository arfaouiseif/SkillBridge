import { Prisma } from '@prisma/client';
import { toMessageResponse } from './message';
import { isOnline } from './presence';
import { prisma } from './prisma';

// The two ids in a fixed order: smaller first
export function pairKey(a: number, b: number) {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

// The `ConversationSummary` format from openapi.yaml, for the conversations of one user
export async function loadSummaries(userId: number, extraWhere: Prisma.ConversationWhereInput = {}) {
  const conversations = await prisma.conversation.findMany({
    where: { AND: [{ OR: [{ userAId: userId }, { userBId: userId }] }, extraWhere] },
    include: {
      userA: { select: { id: true, name: true } },
      userB: { select: { id: true, name: true } },
      messages: { orderBy: { id: 'desc' }, take: 1 }, // only the last message
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Unread messages per conversation, in a single query
  const unread = await prisma.message.groupBy({
    by: ['conversationId'],
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderId: { not: userId },
      readAt: null,
    },
    _count: { _all: true },
  });
  const unreadByConversation = new Map(unread.map((u) => [u.conversationId, u._count._all]));

  return conversations.map((c) => {
    const other = c.userAId === userId ? c.userB : c.userA;
    const last = c.messages[0];
    return {
      id: c.id,
      otherUser: { id: other.id, name: other.name, online: isOnline(other.id) },
      lastMessage: last ? toMessageResponse(last) : null,
      unreadCount: unreadByConversation.get(c.id) ?? 0,
      updatedAt: c.updatedAt.toISOString(),
    };
  });
}