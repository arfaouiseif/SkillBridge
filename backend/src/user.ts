import { Prisma } from '@prisma/client';

// Tells Prisma to also load each user's skills (with the skill details)
export const userInclude = {
  skills: { include: { skill: true } },
} satisfies Prisma.UserInclude;

export type UserWithSkills = Prisma.UserGetPayload<{ include: typeof userInclude }>;

// what anyone can see about a user (all but no email)
export function toPublicUserResponse(user: UserWithSkills) {
  return {
    id: user.id,
    name: user.name,
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

// what a uset sees : the public part with the e-mail
export function toUserResponse(user: UserWithSkills){
  return {...toPublicUserResponse(user), email:user.email};
}