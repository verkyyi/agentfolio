// JSON Resume types

export interface Location {
  city: string;
  region?: string;
  countryCode?: string;
}

export interface Profile {
  network: string;
  url: string;
  username?: string;
}

export interface Basics {
  name: string;
  label?: string;
  email: string;
  phone?: string;
  summary?: string;
  location: Location;
  profiles: Profile[];
}

export interface Work {
  id?: string;
  name: string;
  position: string;
  location?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  highlights: string[];
}

export interface ResumeProject {
  id?: string;
  name: string;
  description: string;
  url?: string;
  github?: string;
  startDate?: string;
  endDate?: string;
  highlights: string[];
  keywords: string[];
}

export interface Skill {
  id?: string;
  name: string;
  keywords: string[];
}

export interface Education {
  institution: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  score?: string;
}

export interface Volunteer {
  organization: string;
  position: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  summary?: string;
}

export interface MatchScore {
  overall: number;
  by_category: Record<string, number>;
  matched_keywords: string[];
  missing_keywords: string[];
}

export interface AgentfolioMeta {
  company?: string;
  generated_by?: string;
  summary_template?: string;
  summary_defaults?: Record<string, string>;
  match_score?: MatchScore;
  skill_emphasis?: string[];
  section_order?: SectionName[];
}

export interface Meta {
  version?: string;
  lastModified?: string;
  agentfolio?: AgentfolioMeta;
}

export type SectionName =
  | 'basics'
  | 'work'
  | 'projects'
  | 'skills'
  | 'education'
  | 'volunteer';

export interface AdaptedResume {
  basics: Basics;
  work: Work[];
  projects: ResumeProject[];
  skills: Skill[];
  education: Education[];
  volunteer: Volunteer[];
  meta: Meta;
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

export interface CompanyAnalytics {
  sessions: number;
  avg_duration_s: number;
  avg_max_scroll_pct: number;
  section_dwell_avg_s: Record<string, number>;
  project_clicks: Record<string, number>;
  cta_clicks: Record<string, number>;
}

export interface AnalyticsDoc {
  generated_at: string;
  source_issues: number;
  total_sessions: number;
  unique_companies: number;
  by_company: Record<string, CompanyAnalytics>;
  global: {
    avg_duration_s: number;
    top_projects: Array<[string, number]>;
    top_sections: Array<[string, number]>;
  };
}
