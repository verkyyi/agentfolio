import type { Volunteer } from '../types';

interface Props {
  items: Volunteer[];
}

export function VolunteeringSection({ items }: Props) {
  return (
    <section aria-label="Volunteering">
      <h2>Volunteering</h2>
      <ul>
        {items.map((v, i) => (
          <li key={i}>
            <strong>{v.position}</strong> · {v.organization}{v.startDate ? ` · ${v.startDate}` : ''}{v.endDate ? ` – ${v.endDate}` : ''}
            {v.summary && <p>{v.summary}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
