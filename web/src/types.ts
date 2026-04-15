export interface Contact {
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
}

export interface Bullet {
  id: string;
  text: string;
  tags?: string[];
  adaptations?: Record<string, string | null>;
}

export interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  dates: string;
  subtitle?: string;
  bullets: Bullet[];
}

export interface Project {
  id: string;
  name: string;
  tagline: string;
  url: string;
  github: string;
  dates: string;
  tags: string[];
  bullets: Bullet[];
}

export interface Education {
  degree: string;
  school: string;
  location: string;
  dates: string;
  note?: string;
}

export interface SkillGroup {
  id: string;
  label: string;
  items: string[];
}

export interface Volunteering {
  title: string;
  org: string;
  location: string;
  dates: string;
  description: string;
}

export interface BaseResume {
  name: string;
  contact: Contact;
  summary_template: string;
  summary_defaults: Record<string, string>;
  experience: Experience[];
  projects: Project[];
  education: Education[];
  skills: { groups: SkillGroup[] };
  volunteering: Volunteering[];
}

export interface MatchScore {
  overall: number;
  by_category: Record<string, number>;
  matched_keywords: string[];
  missing_keywords: string[];
}

export type SectionName =
  | 'summary'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'education'
  | 'volunteering';

export interface AdaptedResume {
  company: string;
  generated_at: string;
  generated_by: string;
  summary: string;
  section_order: SectionName[];
  experience_order: string[];
  bullet_overrides: Record<string, string>;
  project_order: string[];
  skill_emphasis: string[];
  match_score: MatchScore;
}

export interface SlugEntry {
  company: string;
  role: string | null;
  created: string;
  context: string;
}

export type SlugRegistry = Record<string, SlugEntry>;

export interface VisitorContext {
  source: 'slug' | 'default';
  slug?: string;
  company: string;
  role: string | null;
}
