import { useState } from 'react';

interface Props {
  onSubmit: (payload: { company: string; role: string }) => void;
}

export function SelfIdPrompt({ onSubmit }: Props) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');

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
        />
      </label>
      <label>
        Role
        <input
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </label>
      <button type="submit">Show me →</button>
    </form>
  );
}
