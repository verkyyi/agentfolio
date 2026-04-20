import './Hero.css';

export interface HeroProps {
  name: string;
  tagline?: string;
  image?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

export function Hero({ name, tagline, image }: HeroProps) {
  return (
    <header className="hero">
      <div className="hero-avatar" data-testid="hero-avatar">
        {image ? <img src={image} alt={name} /> : <span>{initials(name)}</span>}
      </div>
      <h1 className="hero-name">{name}</h1>
      {tagline && <p className="hero-tagline">{tagline}</p>}
      <p className="hero-explainer">
        This page is an agent — ask it anything about my background, projects, or fit for a role.
      </p>
    </header>
  );
}
