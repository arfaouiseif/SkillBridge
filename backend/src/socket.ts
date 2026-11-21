import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { z } from 'zod';
import { otherParticipantId, partnerIdsOf } from './chat';
import { addConnection, removeConnection } from './presence';
import { prisma } from './prisma';
import { verifyToken } from './token';

let io: Server | null = null;

const typingSchema = z.object({
  conversationId: z.number().int(),
  isTyping: z.boolean(),
});

function userRoom(userId: number): string {
  return `user:${userId}`;
}

// Send an event to a user: every tab they have open receives it
export function emitToUser(userId: number, event: string, payload: unknown): void {
  io?.to(userRoom(userId)).emit(event, payload);
}

// Tell the people this user talks to that they came online or went offline
async function broadcastPresence(userId: number, online: boolean): Promise<void> {
  try {
    for (const partnerId of await partnerIdsOf(userId)) {
      emitToUser(partnerId, 'presence', { userId, online });
    }
  } catch (error) {
    console.error('presence broadcast failed', error);
  }
}

export function initSocket(server: HttpServer): void {
  io = new Server(server, { cors: { origin: 'http://localhost:4200' } });

  // Authentication: runs once per connection, before it is accepted
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string') {
        throw new Error('missing token');
      }
      socket.data.userId = verifyToken(token);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as number;

    // Everything addressed to this user goes through this room
    socket.join(userRoom(userId));

    // First connection of this user: they just came online
    if (addConnection(userId)) {
      void broadcastPresence(userId, true);
    }

    // "Is typing": forward it to the other participant, nothing is stored
    socket.on('typing', async (payload: unknown) => {
      try {
        const parsed = typingSchema.safeParse(payload);
        if (!parsed.success) return;
        const { conversationId, isTyping } = parsed.data;

        const conversation = await prisma.conversation.findFirst({
          where: { id: conversationId, OR: [{ userAId: userId }, { userBId: userId }] },
        });
        if (!conversation) return; // not a participant: ignored

        emitToUser(otherParticipantId(conversation, userId), 'typing', {
          conversationId,
          userId,
          isTyping,
        });
      } catch (error) {
        console.error('typing handler failed', error);
      }
    });

    // Last connection closed: the user went offline
    socket.on('disconnect', () => {
      if (removeConnection(userId)) {
        void broadcastPresence(userId, false);
      }
    });
  });
}