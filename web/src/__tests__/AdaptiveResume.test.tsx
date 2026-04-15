import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdaptiveResume } from '../components/AdaptiveResume';
import type { AdaptedResume, BaseResume, VisitorContext } from '../types';

const base: BaseResume = {
  name: 'Lianghui Yi',
  contact: {
    location: 'Santa Clara, CA',
    phone: '(925) 900-3467',
    email: 'verky.yi@gmail.com',
    linkedin: 'https://linkedin.com/in/lianghuiyi',
    github: 'https://github.com/verkyyi',
  },
  summary_template: 'ignored',
  summary_defaults: {},
  experience: [
    {
      id: 'a',
      title: 'A Title',
      company: 'A Co',
      location: 'X',
      dates: '2024',
      bullets: [{ id: 'b1', text: 'Original bullet' }],
    },
  ],
  projects: [
    {
      id: 'p1',
      name: 'Project One',
      tagline: 'tag',
      url: 'https://example.com',
      github: 'https://example.com',
      dates: '2025',
      tags: [],
      bullets: [{ id: 'pb1', text: 'Project bullet' }],
    },
  ],
  education: [
    { degree: 'Deg', school: 'Sch', location: 'Loc', dates: '2023' },
  ],
  skills: {
    groups: [
      { id: 'ai', label: 'AI', items: ['Python', 'RAG Pipelines'] },
    ],
  },
  volunteering: [
    { title: 'V', org: 'O', location: 'L', dates: 'd', description: 'desc' },
  ],
};

const adapted: AdaptedResume = {
  company: 'Cohere',
  generated_at: '2026-04-15T00:00:00+00:00',
  generated_by: 'adapt_one.py v0.1',
  summary: 'Adapted summary text',
  section_order: ['summary', 'projects', 'experience', 'skills'],
  experience_order: ['a'],
  bullet_overrides: { b1: 'Overridden bullet' },
  project_order: ['p1'],
  skill_emphasis: ['RAG Pipelines'],
  match_score: {
    overall: 0.87,
    by_category: { ai: 0.9 },
    matched_keywords: ['Python'],
    missing_keywords: [],
  },
};

const context: VisitorContext = {
  source: 'slug',
  slug: 'cohere-fde',
  company: 'cohere',
  role: 'FDE, Agentic Platform',
};

describe('AdaptiveResume', () => {
  it('renders the adapted summary', () => {
    render(<AdaptiveResume base={base} adapted={adapted} context={context} />);
    expect(screen.getByText('Adapted summary text')).toBeInTheDocument();
  });

  it('renders experience bullets with overrides applied', () => {
    render(<AdaptiveResume base={base} adapted={adapted} context={context} />);
    expect(screen.getByText('Overridden bullet')).toBeInTheDocument();
    expect(screen.queryByText('Original bullet')).not.toBeInTheDocument();
  });

  it('renders sections in the order specified by adapted.section_order', () => {
    render(<AdaptiveResume base={base} adapted={adapted} context={context} />);
    const sections = screen.getAllByRole('region');
    const labels = sections.map((s) => s.getAttribute('aria-label'));
    expect(labels).toEqual(['Summary', 'Projects', 'Experience', 'Skills']);
  });

  it('emphasizes skills listed in adapted.skill_emphasis', () => {
    render(<AdaptiveResume base={base} adapted={adapted} context={context} />);
    const rag = screen.getByText('RAG Pipelines');
    expect(rag.getAttribute('data-emphasized')).toBe('true');
    const py = screen.getByText('Python');
    expect(py.getAttribute('data-emphasized')).toBe('false');
  });

  it('renders match score', () => {
    render(<AdaptiveResume base={base} adapted={adapted} context={context} />);
    expect(screen.getByText(/87% match/)).toBeInTheDocument();
  });

  it('renders debug panel with detected company', () => {
    render(<AdaptiveResume base={base} adapted={adapted} context={context} />);
    expect(screen.getByText('Agent Context')).toBeInTheDocument();
    expect(screen.getByText('cohere')).toBeInTheDocument();
  });

  it('renders name and contact from base resume', () => {
    render(<AdaptiveResume base={base} adapted={adapted} context={context} />);
    expect(screen.getByText('Lianghui Yi')).toBeInTheDocument();
    expect(screen.getByText('verky.yi@gmail.com')).toBeInTheDocument();
  });
});
