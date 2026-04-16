import type { Skill } from '../types';

interface Props {
  skills: Skill[];
  emphasis: string[];
}

export function SkillsSection({ skills, emphasis }: Props) {
  const emphasisSet = new Set(emphasis);
  return (
    <section aria-label="Skills">
      <h2>Skills</h2>
      {skills.map((s, i) => (
        <div key={s.id ?? i}>
          <h3>{s.name}</h3>
          <ul>
            {s.keywords.map((kw) => (
              <li key={kw} data-emphasized={emphasisSet.has(kw) ? 'true' : 'false'}>
                {kw}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
