import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentStats } from '../components/AgentStats';

const doc = {
  generated_at: '2026-04-20T06:00:00+00:00',
  source_issues: 47,
  total_sessions: 47,
  unique_companies: 4,
  by_company: {
    cohere: {
      sessions: 12,
      avg_duration_s: 87.3,
      avg_max_scroll_pct: 0.72,
      section_dwell_avg_s: { summary: 5.2, projects: 18.4 },
      project_clicks: { agentfolio: 8, ainbox: 3 },
      cta_clicks: { email: 4, linkedin: 2 },
    },
  },
  global: {
    avg_duration_s: 62.1,
    top_projects: [['agentfolio', 12], ['ainbox', 7]] as Array<[string, number]>,
    top_sections: [['projects', 17.9], ['experience', 11.2]] as Array<[string, number]>,
  },
};

describe('AgentStats', () => {
  it('renders total sessions and unique companies', () => {
    render(<AgentStats data={doc} />);
    expect(screen.getByText(/47/)).toBeInTheDocument();
    expect(screen.getByText(/4/)).toBeInTheDocument();
  });

  it('renders top projects list', () => {
    render(<AgentStats data={doc} />);
    expect(screen.getByText(/agentfolio/i)).toBeInTheDocument();
    expect(screen.getByText(/ainbox/i)).toBeInTheDocument();
  });

  it('renders generated_at as readable date', () => {
    render(<AgentStats data={doc} />);
    expect(screen.getByText(/2026-04-20/)).toBeInTheDocument();
  });
});
