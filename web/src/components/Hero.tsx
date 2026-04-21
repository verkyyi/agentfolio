import './Hero.css';

export interface HeroProps {
  name: string;
  tagline?: string;
  image?: string;
}

export function Hero({ name, tagline, image }: HeroProps) {
  return (
    <header className="hero">
      {image && (
        <div className="hero-avatar" data-testid="hero-avatar">
          <img src={image} alt={name} />
        </div>
      )}
      <h1 className="hero-name">{name}</h1>
      {tagline && <p className="hero-tagline">{tagline}</p>}
    </header>
  );
}
