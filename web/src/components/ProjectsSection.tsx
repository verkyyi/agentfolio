import type { Project } from '../types';

interface Props {
  projects: Project[];
  order: string[];
  onProjectClick?: (projectId: string, link: 'url' | 'github') => void;
}

export function ProjectsSection({ projects, order, onProjectClick }: Props) {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as Project[];

  return (
    <section aria-label="Projects">
      <h2>Projects</h2>
      {ordered.map((p) => (
        <article key={p.id}>
          <header>
            <h3>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => onProjectClick?.(p.id, 'url')}
              >
                {p.name}
              </a>
            </h3>
            <p>
              {p.tagline} · {p.dates}
            </p>
          </header>
          <ul>
            {p.bullets.map((b) => (
              <li key={b.id}>{b.text}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
