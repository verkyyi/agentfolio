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
  source: 'slug' | 'self-id' | 'default';
  slug?: string;
  company: string;
  role: string | null;
}

export type ProgressStep = 'jd_parsed' | 'profile_built' | 'adapted' | 'committed';

export type ProgressComment =
  | { status: 'progress'; step: ProgressStep; timestamp: string }
  | { status: 'complete'; adapted_path: string; company_slug: string; timestamp: string }
  | { status: 'rate_limited'; timestamp: string }
  | { status: 'error'; message: string; timestamp: string };

export interface GithubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string }>;
}

export type AnalyticsEvent =
  | {
      type: 'session_start';
      data: { company: string; source: string; adaptation: string; match_score: number };
      ts: number;
    }
  | {
      type: 'session_heartbeat';
      data: { duration_ms: number; max_scroll_pct: number };
      ts: number;
    }
  | {
      type: 'section_dwell';
      data: { section: string; ms: number };
      ts: number;
    }
  | {
      type: 'project_click';
      data: { project_id: string; link: 'url' | 'github' };
      ts: number;
    }
  | {
      type: 'cta_click';
      data: { target: 'email' | 'linkedin' | 'github' };
      ts: number;
    }
  | {
      type: 'chat_question';
      data: { question: string; issue_number: number };
      ts: number;
    };

export interface AnalyticsFlushPayload {
  session_id: string;
  events: AnalyticsEvent[];
}

export type ChatComment =
  | { status: 'thinking'; ts: string }
  | { status: 'answer'; answer: string; model: string; ts: string }
  | { status: 'rate_limited'; ts: string }
  | { status: 'error'; message: string; ts: string };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  issueNumber?: number;
}
