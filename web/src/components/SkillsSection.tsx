import type { SkillGroup } from '../types';

interface Props {
  groups: SkillGroup[];
  emphasis: string[];
}

export function SkillsSection({ groups, emphasis }: Props) {
  const emphasisSet = new Set(emphasis);
  return (
    <section aria-label="Skills">
      <h2>Skills</h2>
      {groups.map((g) => (
        <div key={g.id}>
          <h3>{g.label}</h3>
          <ul>
            {g.items.map((item) => (
              <li
                key={item}
                data-emphasized={emphasisSet.has(item) ? 'true' : 'false'}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
