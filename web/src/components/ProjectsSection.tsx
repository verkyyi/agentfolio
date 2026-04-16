import type { ResumeProject } from '../types';

interface Props {
  projects: ResumeProject[];
  onProjectClick?: (projectId: string, link: 'url' | 'github') => void;
}

export function ProjectsSection({ projects, onProjectClick }: Props) {
  return (
    <section aria-label="Projects">
      <h2>Projects</h2>
      {projects.map((p, i) => (
        <article key={p.id ?? i}>
          <header>
            <h3>
              {p.url ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onProjectClick?.(p.id ?? p.name, 'url')}
                >
                  {p.name}
                </a>
              ) : (
                p.name
              )}
            </h3>
            <p>
              {p.description}{p.startDate ? ` · ${p.startDate}` : ''}{p.endDate ? ` – ${p.endDate}` : p.startDate ? ' – Present' : ''}
            </p>
          </header>
          <ul>
            {p.highlights.map((h, j) => (
              <li key={j}>{h}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
