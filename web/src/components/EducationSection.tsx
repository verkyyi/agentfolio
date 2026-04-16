import type { Education } from '../types';

interface Props {
  education: Education[];
}

export function EducationSection({ education }: Props) {
  return (
    <section aria-label="Education">
      <h2>Education</h2>
      <ul>
        {education.map((e, i) => (
          <li key={i}>
            <strong>{e.studyType && e.area ? `${e.studyType} of ${e.area}` : e.area || e.studyType || ''}</strong> — {e.institution}
            {e.location && ` · ${e.location}`}
            {e.startDate && ` · ${e.startDate}`}{e.endDate && ` – ${e.endDate}`}
            {e.score && ` · ${e.score}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
