import type { Experience } from '../types';

interface Props {
  experience: Experience[];
  order: string[];
  bulletOverrides: Record<string, string>;
}

export function ExperienceSection({ experience, order, bulletOverrides }: Props) {
  const byId = new Map(experience.map((e) => [e.id, e]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as Experience[];

  return (
    <section aria-label="Experience">
      <h2>Experience</h2>
      {ordered.map((exp) => (
        <article key={exp.id}>
          <header>
            <h3>
              {exp.title} · {exp.company}
            </h3>
            <p>
              {exp.location} · {exp.dates}
            </p>
            {exp.subtitle && <p>{exp.subtitle}</p>}
          </header>
          <ul>
            {exp.bullets.map((b) => (
              <li key={b.id}>{bulletOverrides[b.id] ?? b.text}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
