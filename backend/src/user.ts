import { Prisma } from '@prisma/client';

// Tells Prisma to also load each user's skills (with the skill details)
export const userInclude = {
  skills: { include: { skill: true } },
} satisfies Prisma.UserInclude;

export type UserWithSkills = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export function toUserResponse(user: UserWithSkills) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio,
    university: user.university,
    year: user.year,
    city: user.city,
    skills: user.skills.map((s) => ({
      skillId: s.skillId,
      type: s.type,
      level: s.level,
      mode: s.mode,
      skill: { id: s.skill.id, name: s.skill.name, category: s.skill.category },
    })),
  };
}