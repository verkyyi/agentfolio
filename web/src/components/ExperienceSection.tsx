import type { Work } from '../types';

interface Props {
  work: Work[];
}

export function ExperienceSection({ work }: Props) {
  return (
    <section aria-label="Experience">
      <h2>Experience</h2>
      {work.map((w, i) => (
        <article key={w.id ?? i}>
          <header>
            <h3>
              {w.position} · {w.name}
            </h3>
            <p>
              {w.location}{w.location && w.startDate ? ' · ' : ''}{w.startDate}{w.endDate ? ` – ${w.endDate}` : w.startDate ? ' – Present' : ''}
            </p>
            {w.description && <p>{w.description}</p>}
          </header>
          <ul>
            {w.highlights.map((h, j) => (
              <li key={j}>{h}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
