import './Hero.css';

export interface HeroProps {
  name: string;
  tagline?: string;
  image?: string;
  profiles?: { network: string; url: string }[];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

export function Hero({ name, tagline, image, profiles }: HeroProps) {
  const visibleProfiles = profiles?.filter((p) => p.network && p.url) ?? [];

  return (
    <header className="hero">
      <div className="hero-avatar" data-testid="hero-avatar">
        {image ? <img src={image} alt={name} /> : <span>{initials(name)}</span>}
      </div>
      <h1 className="hero-name">{name}</h1>
      {tagline && <p className="hero-tagline">{tagline}</p>}
      {visibleProfiles.length > 0 && (
        <nav className="hero-links" aria-label="Social links">
          {visibleProfiles.map((profile) => (
            <a key={`${profile.network}-${profile.url}`} href={profile.url} target="_blank" rel="noreferrer">
              {profile.network}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
