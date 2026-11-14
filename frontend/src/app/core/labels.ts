import { SkillCategory, SkillLevel, SkillMode } from './models/api.models';

export const LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'débutant',
  intermediate: 'intermédiaire',
  advanced: 'avancé',
};

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  tech: 'Code',
  design: 'Design',
  diy: 'Bricolage',
  languages: 'Langues',
  music_arts: 'Musique',
  daily_life: 'Quotidien',
  academic: 'Études',
  career: 'Carrière',
};

export const MODE_LABELS: Record<SkillMode, string> = {
  online: 'en ligne',
  in_person: 'sur place',
  both: 'en ligne ou sur place',
};