import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdaptiveResume } from '../components/AdaptiveResume';
import type { AdaptedResume, VisitorContext } from '../types';

function mockAdapted(overrides: Record<string, any> = {}): AdaptedResume {
  return {
    basics: {
      name: 'Test User',
      email: 'test@example.com',
      summary: 'Test summary',
      location: { city: 'Test City', region: 'TC' },
      profiles: [
        { network: 'LinkedIn', url: 'https://linkedin.com/in/test' },
        { network: 'GitHub', url: 'https://github.com/test' },
      ],
    },
    work: [
      {
        id: 'job1',
        name: 'Test Corp',
        position: 'Engineer',
        location: 'Test City',
        startDate: '2024-01',
        highlights: ['Did something great'],
      },
    ],
    projects: [
      {
        id: 'proj1',
        name: 'Test Project',
        description: 'A test project',
        url: 'https://example.com',
        startDate: '2024-01',
        highlights: ['Built something'],
        keywords: ['test'],
      },
    ],
    skills: [
      { id: 'sk1', name: 'Languages', keywords: ['Python', 'TypeScript'] },
    ],
    education: [
      { institution: 'Test University', area: 'CS', studyType: 'BS', location: 'Test City' },
    ],
    volunteer: [],
    meta: {
      version: '1.0.0',
      lastModified: '2026-04-16T00:00:00+00:00',
      agentfolio: {
        company: 'default',
        generated_by: 'test',
        match_score: { overall: 0.5, by_category: { sk1: 0.5 }, matched_keywords: ['Python'], missing_keywords: ['Ruby'] },
        skill_emphasis: ['Python'],
        section_order: ['basics', 'work', 'projects', 'skills', 'education', 'volunteer'],
      },
    },
    ...overrides,
  } as AdaptedResume;
}

const adapted = mockAdapted({
  basics: {
    name: 'Alex Chen',
    email: 'alex@example.com',
    summary: 'Adapted summary text',
    location: { city: 'San Francisco', region: 'CA' },
    profiles: [
      { network: 'LinkedIn', url: 'https://linkedin.com/in/alexchen' },
      { network: 'GitHub', url: 'https://github.com/alexchen' },
    ],
  },
  work: [
    {
      id: 'a',
      name: 'A Co',
      position: 'A Title',
      location: 'X',
      startDate: '2024',
      highlights: ['Overridden bullet'],
    },
  ],
  projects: [
    {
      id: 'p1',
      name: 'Project One',
      description: 'tag',
      url: 'https://example.com',
      startDate: '2025',
      highlights: ['Project bullet'],
      keywords: [],
    },
  ],
  skills: [
    { id: 'ai', name: 'AI', keywords: ['Python', 'RAG Pipelines'] },
  ],
  meta: {
    version: '1.0.0',
    lastModified: '2026-04-15T00:00:00+00:00',
    agentfolio: {
      company: 'sample-company',
      generated_by: 'sample',
      match_score: {
        overall: 0.87,
        by_category: { ai: 0.9 },
        matched_keywords: ['Python'],
        missing_keywords: [],
      },
      skill_emphasis: ['RAG Pipelines'],
      section_order: ['basics', 'projects', 'work', 'skills'],
    },
  },
});

const context: VisitorContext = {
  source: 'slug',
  slug: 'sample',
  company: 'sample-company',
  role: 'Software Engineer',
};

describe('AdaptiveResume', () => {
  it('renders the adapted summary', () => {
    render(<AdaptiveResume adapted={adapted} context={context} />);
    expect(screen.getByText('Adapted summary text')).toBeInTheDocument();
  });

  it('renders experience highlights from adapted work', () => {
    render(<AdaptiveResume adapted={adapted} context={context} />);
    expect(screen.getByText('Overridden bullet')).toBeInTheDocument();
  });

  it('renders sections in the order specified by adapted.meta.agentfolio.section_order', () => {
    render(<AdaptiveResume adapted={adapted} context={context} />);
    const sections = screen.getAllByRole('region');
    const labels = sections.map((s) => s.getAttribute('aria-label'));
    expect(labels).toEqual(['Summary', 'Projects', 'Experience', 'Skills']);
  });

  it('emphasizes skills listed in adapted.meta.agentfolio.skill_emphasis', () => {
    render(<AdaptiveResume adapted={adapted} context={context} />);
    const rag = screen.getByText('RAG Pipelines');
    expect(rag.getAttribute('data-emphasized')).toBe('true');
    const py = screen.getByText('Python');
    expect(py.getAttribute('data-emphasized')).toBe('false');
  });

  it('renders match score', () => {
    render(<AdaptiveResume adapted={adapted} context={context} />);
    expect(screen.getByText(/87% match/)).toBeInTheDocument();
  });

  it('renders debug panel with detected company', () => {
    render(<AdaptiveResume adapted={adapted} context={context} />);
    expect(screen.getByText('Agent Context')).toBeInTheDocument();
    expect(screen.getAllByText('sample-company').length).toBeGreaterThan(0);
  });

  it('renders name and contact from adapted resume', () => {
    render(<AdaptiveResume adapted={adapted} context={context} />);
    expect(screen.getByText('Alex Chen')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
  });

  it('calls onCtaClick when email link is clicked', async () => {
    const onCtaClick = (await import('vitest')).vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();
    render(
      <AdaptiveResume adapted={adapted} context={context} onCtaClick={onCtaClick} />,
    );
    await user.click(screen.getByText('alex@example.com'));
    expect(onCtaClick).toHaveBeenCalledWith('email');
  });

  it('calls onProjectClick when a project link is clicked', async () => {
    const onProjectClick = (await import('vitest')).vi.fn();
    const user = (await import('@testing-library/user-event')).default.setup();
    render(
      <AdaptiveResume
        adapted={adapted}
        context={context}
        onProjectClick={onProjectClick}
      />,
    );
    await user.click(screen.getByText('Project One'));
    expect(onProjectClick).toHaveBeenCalledWith('p1', 'url');
  });
});
