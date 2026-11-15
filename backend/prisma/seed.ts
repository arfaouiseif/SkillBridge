import { PrismaClient, SkillCategory, SkillLevel, SkillMode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const B: SkillLevel = 'beginner';
const I: SkillLevel = 'intermediate';
const A: SkillLevel = 'advanced';

// Skills catalogue, grouped by category (matches the enum in schema.prisma)
const catalogue: Record<SkillCategory, string[]> = {
  tech: ['Python', 'JavaScript', 'Angular', 'Excel', 'Networking', 'Linux', 'Git'],
  design: ['Photoshop', 'Figma', 'Video editing', 'Drawing'],
  languages: ['English', 'French', 'Arabic', 'German', 'Spanish'],
  diy: ['Painting walls', 'Basic plumbing', 'Basic electricity', 'Furniture assembly', 'Tiling'],
  daily_life: ['Cooking', 'Sewing', 'Gardening', 'Bike repair'],
  academic: ['Math', 'Physics', 'Essay writing', 'Study methods'],
  music_arts: ['Guitar', 'Piano', 'Calligraphy', 'Photography'],
  career: ['CV writing', 'Interview prep', 'Public speaking', 'Time management'],
};

type Entry = [string, SkillLevel];

interface SeedUser {
  name: string;
  university: string;
  year: number;
  city: string;
  bio: string;
  teach: Entry[];
  learn: Entry[];
}

// Fake users. Their teach/learn lists are designed to overlap, so matching has results.
const users: SeedUser[] = [
  { name: 'Sarah Ben Ali', university: "SUP'COM", year: 2, city: 'Tunis', bio: 'Design lover, learning to code.', teach: [['Photoshop', A], ['Figma', I]], learn: [['Python', B], ['Angular', B]] },
  { name: 'Karim Trabelsi', university: "SUP'COM", year: 3, city: 'Tunis', bio: 'Python and Linux enthusiast.', teach: [['Python', A], ['Linux', I]], learn: [['Photoshop', B], ['Guitar', B]] },
  { name: 'Amine Gharbi', university: 'ENIT', year: 2, city: 'Tunis', bio: 'I fix and build things around the house.', teach: [['Basic plumbing', A], ['Furniture assembly', A], ['Painting walls', I]], learn: [['Guitar', B], ['English', I]] },
  { name: 'Léa Mansour', university: 'INSAT', year: 3, city: 'Tunis', bio: 'Guitarist, always painting something.', teach: [['Guitar', A], ['Piano', I]], learn: [['Painting walls', B], ['Cooking', B]] },
  { name: 'Yasmine Jlassi', university: 'FST', year: 1, city: 'Tunis', bio: 'Cooking and sewing at home.', teach: [['Cooking', A], ['Sewing', I]], learn: [['English', I], ['Excel', B]] },
  { name: 'Omar Khelifi', university: 'ENIT', year: 4, city: 'Ariana', bio: 'Happy to help with English and maths.', teach: [['English', A], ['Math', I]], learn: [['Basic electricity', B], ['Bike repair', B]] },
  { name: 'Ines Bouazizi', university: 'ESPRIT', year: 2, city: 'Ariana', bio: 'Spreadsheets and productivity.', teach: [['Excel', A], ['Time management', I]], learn: [['Drawing', B], ['Cooking', B]] },
  { name: 'Mehdi Chaabane', university: "SUP'COM", year: 1, city: 'Tunis', bio: 'First-year, loves web dev.', teach: [['JavaScript', I], ['Git', I]], learn: [['Photography', B], ['Public speaking', B]] },
  { name: 'Nour Hamdi', university: 'Université de Carthage', year: 3, city: 'La Marsa', bio: 'French and writing tutor.', teach: [['French', A], ['Essay writing', A]], learn: [['Python', B], ['German', B]] },
  { name: 'Slim Ayari', university: 'ENSI', year: 2, city: 'Manouba', bio: 'Front-end developer in the making.', teach: [['Angular', I], ['JavaScript', A]], learn: [['Figma', B], ['Spanish', B]] },
  { name: 'Rania Dridi', university: 'INSAT', year: 4, city: 'Tunis', bio: 'Physics and maths help.', teach: [['Physics', A], ['Math', A]], learn: [['Gardening', B], ['Piano', B]] },
  { name: 'Youssef Maatoug', university: 'ESSECT', year: 3, city: 'Tunis', bio: 'Career coaching for students.', teach: [['Public speaking', A], ['Interview prep', A], ['CV writing', A]], learn: [['Linux', B], ['Networking', B]] },
  { name: 'Salma Ferchichi', university: 'ENIT', year: 1, city: 'Tunis', bio: 'Sketchbook always with me.', teach: [['Drawing', A], ['Calligraphy', A]], learn: [['JavaScript', B], ['Study methods', B]] },
  { name: 'Hedi Rekik', university: "SUP'COM", year: 2, city: 'Tunis', bio: 'Networks and Linux.', teach: [['Networking', A], ['Linux', A]], learn: [['German', I], ['Video editing', B]] },
  { name: 'Mariem Zouari', university: 'FSEG', year: 3, city: 'Sfax', bio: 'Garden and kitchen person.', teach: [['Gardening', A], ['Cooking', I]], learn: [['French', I], ['Excel', B]] },
  { name: 'Walid Cherif', university: 'ENIT', year: 3, city: 'Tunis', bio: 'Video editing and photography.', teach: [['Video editing', A], ['Photography', A]], learn: [['Math', I], ['Study methods', B]] },
  { name: 'Aya Belhaj', university: 'ISG', year: 2, city: 'Tunis', bio: 'Languages are my thing.', teach: [['German', A], ['Spanish', I]], learn: [['Sewing', B], ['Calligraphy', B]] },
  { name: 'Fedi Naceur', university: 'FST', year: 4, city: 'Bizerte', bio: 'Handy with electricity and bikes.', teach: [['Basic electricity', A], ['Bike repair', A], ['Tiling', I]], learn: [['Python', B], ['Git', B]] },
  { name: 'Hela Sassi', university: "SUP'COM", year: 3, city: 'Tunis', bio: 'Study methods and writing.', teach: [['Study methods', A], ['Essay writing', I]], learn: [['Basic plumbing', B], ['Painting walls', B]] },
  { name: 'Bilel Mejri', university: 'INSAT', year: 1, city: 'Bizerte', bio: 'Spanish speaker and pianist.', teach: [['Spanish', A], ['Piano', A]], learn: [['Public speaking', B], ['Interview prep', B]] },
];

// Practical skills are done in person, the others online
function modeFor(category: SkillCategory): SkillMode {
  return category === 'diy' || category === 'daily_life' ? 'in_person' : 'online';
}

function emailFor(name: string): string {
  const clean = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '.');
  return `${clean}@example.com`;
}

async function main() {
  // 1. Skills catalogue
  const skillByName = new Map<string, { id: number; category: SkillCategory }>();
  for (const [category, names] of Object.entries(catalogue) as [SkillCategory, string[]][]) {
    for (const name of names) {
      const skill = await prisma.skill.upsert({
        where: { name },
        update: { category },
        create: { name, category },
      });
      skillByName.set(name, { id: skill.id, category: skill.category });
    }
  }

  // 2. Users and their skills (the same password for all, handy for testing)
  const passwordHash = await bcrypt.hash('Password123!', 10);

  for (const [index, u] of users.entries()) {
    const email = emailFor(u.name);
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: u.name, bio: u.bio, university: u.university, year: u.year, city: u.city },
      create: { name: u.name, email, passwordHash, bio: u.bio, university: u.university, year: u.year, city: u.city },
    });

    const rows = [
      ...u.teach.map(([name, level]) => ({ name, level, type: 'teach' as const })),
      ...u.learn.map(([name, level]) => ({ name, level, type: 'learn' as const })),
    ].map(({ name, level, type }) => {
      const skill = skillByName.get(name);
      if (!skill) throw new Error(`Unknown skill in seed: ${name}`);
      return { userId: user.id, skillId: skill.id, type, level, mode: modeFor(skill.category) };
    });
        // Two weekly windows per user, on different weekdays
    const windows = [
      { weekday: (index % 5) + 1, startMinute: 18 * 60, endMinute: 20 * 60 },
      { weekday: ((index + 2) % 5) + 1, startMinute: 17 * 60, endMinute: 19 * 60 },
    ];
    await prisma.availability.deleteMany({ where: { teacherId: user.id } });
    await prisma.availability.createMany({
      data: windows.map((w) => ({ ...w, teacherId: user.id })),
    });

    await prisma.userSkill.deleteMany({ where: { userId: user.id } });
    await prisma.userSkill.createMany({ data: rows });
  }

  console.log(`Seeded ${skillByName.size} skills and ${users.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());