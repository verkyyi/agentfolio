import './Hero.css';

export interface HeroProps {
  name: string;
  tagline?: string;
  profiles?: { network: string; url: string }[];
}

export function Hero({ name, tagline, profiles }: HeroProps) {
  const visibleProfiles = profiles?.filter((p) => p.network && p.url) ?? [];

  return (
    <header className="hero">
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
