import type { Volunteering } from '../types';

interface Props {
  items: Volunteering[];
}

export function VolunteeringSection({ items }: Props) {
  return (
    <section aria-label="Volunteering">
      <h2>Volunteering</h2>
      <ul>
        {items.map((v) => (
          <li key={`${v.org}-${v.title}`}>
            <strong>{v.title}</strong> · {v.org} · {v.dates}
            <p>{v.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
