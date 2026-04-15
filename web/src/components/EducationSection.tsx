import type { Education } from '../types';

interface Props {
  education: Education[];
}

export function EducationSection({ education }: Props) {
  return (
    <section aria-label="Education">
      <h2>Education</h2>
      <ul>
        {education.map((e) => (
          <li key={`${e.school}-${e.degree}`}>
            <strong>{e.degree}</strong> — {e.school}
            {e.location && ` · ${e.location}`}
            {e.dates && ` · ${e.dates}`}
            {e.note && ` · ${e.note}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
