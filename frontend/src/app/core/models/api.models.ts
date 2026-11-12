export type SkillCategory =
  | 'tech' | 'design' | 'languages' | 'diy'
  | 'daily_life' | 'academic' | 'music_arts' | 'career';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type SkillMode = 'online' | 'in_person' | 'both';
export type SessionStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export interface Skill { id: number; name: string; category: SkillCategory; }

export interface UserSkill {
  skillId: number;
  type: 'teach' | 'learn';
  level: SkillLevel;
  mode: SkillMode;
  skill?: Skill;
}

export interface PublicUser {
  id: number;
  name: string;
  bio?: string | null;
  university?: string | null;
  year?: number | null;
  city?: string | null;
  skills: UserSkill[];
}
export interface User extends PublicUser { email: string; }

export interface AuthResponse { token: string; user: User; }
export interface RegisterRequest { name: string; email: string; password: string; }
export interface LoginRequest { email: string; password: string; }

export interface PaginatedUsers { items: PublicUser[]; page: number; pageSize: number; total: number; }

export interface AvailabilityWindow { weekday: number; startTime: string; endTime: string; }
export interface TimeRange { startAt: string; endAt: string; }
export interface TeacherAvailability { windows: AvailabilityWindow[]; busy: TimeRange[]; }

export interface UserSummary { id: number; name: string; }
export interface Session {
  id: number;
  teacher: UserSummary;
  learner: UserSummary;
  skill: Skill;
  startAt: string;
  endAt: string;
  status: SessionStatus;
  message?: string | null;
  meetingLink?: string | null;
  createdAt: string;
}
export interface CreateSessionRequest {
  teacherId: number;
  skillId: number;
  startAt: string;
  durationMinutes: 30 | 60 | 90 | 120;
  message?: string | null;
}

export interface ApiError { message: string; details?: { field: string; message: string }[]; }