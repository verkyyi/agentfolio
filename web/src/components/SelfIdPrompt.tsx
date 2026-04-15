import { useId, useState } from 'react';

interface Suggestions {
  companies: string[];
  roles: string[];
}

interface Props {
  onSubmit: (payload: { company: string; role: string }) => void;
  onSkip?: () => void;
  suggestions?: Suggestions;
}

export function SelfIdPrompt({ onSubmit, onSkip, suggestions }: Props) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const companyListId = useId();
  const roleListId = useId();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = company.trim();
    const r = role.trim();
    if (!c || !r) return;
    onSubmit({ company: c, role: r });
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Self-identification">
      <p>Who's reading?</p>
      <label>
        Company
        <input
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          list={suggestions?.companies.length ? companyListId : undefined}
          autoComplete="off"
        />
      </label>
      {suggestions?.companies.length ? (
        <datalist id={companyListId}>
          {suggestions.companies.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      ) : null}
      <label>
        Role
        <input
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          list={suggestions?.roles.length ? roleListId : undefined}
          autoComplete="off"
        />
      </label>
      {suggestions?.roles.length ? (
        <datalist id={roleListId}>
          {suggestions.roles.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      ) : null}
      <button type="submit">Show me →</button>
      {onSkip && (
        <button type="button" onClick={onSkip}>
          Skip — show default version
        </button>
      )}
    </form>
  );
}
