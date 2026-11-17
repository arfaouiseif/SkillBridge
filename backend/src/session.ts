import { Prisma } from '@prisma/client';

// Load the teacher, the learner and the skill with each session
export const sessionInclude = {
  teacher: { select: { id: true, name: true } },
  learner: { select: { id: true, name: true } },
  skill: true,
} satisfies Prisma.SessionInclude;

export type SessionWithRelations = Prisma.SessionGetPayload<{ include: typeof sessionInclude }>;

// The `Session` format from openapi.yaml
export function toSessionResponse(s: SessionWithRelations) {
  return {
    id: s.id,
    teacher: s.teacher,
    learner: s.learner,
    skill: { id: s.skill.id, name: s.skill.name, category: s.skill.category },
    startAt: s.startAt.toISOString(),
    endAt: s.endAt.toISOString(),
    status: s.status,
    message: s.message,
    meetingLink: s.meetingLink,
    createdAt: s.createdAt.toISOString(),
  };
}