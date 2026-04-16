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

