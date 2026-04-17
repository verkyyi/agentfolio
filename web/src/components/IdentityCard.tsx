import './IdentityCard.css';

export interface IdentityBasics {
  name: string;
  label?: string;
  summary?: string;
  location?: { city?: string; region?: string };
  profiles?: { network: string; url: string }[];
  email?: string;
}

export interface IdentityCardProps {
  basics: IdentityBasics;
  slug: string;
}

function firstSentence(s: string): string {
  const m = s.match(/^(.+?[.!?])(\s|$)/);
  return m ? m[1] : s;
}

function locationLine(loc?: IdentityBasics['location']): string | null {
  if (!loc) return null;
  const parts = [loc.city, loc.region].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function IdentityCard({ basics, slug }: IdentityCardProps) {
  const loc = locationLine(basics.location);
  const roleBits = basics.label ? [basics.label, loc].filter(Boolean).join(' · ') : null;
  const oneLiner = basics.summary ? firstSentence(basics.summary) : null;
  const hasProfiles = (basics.profiles && basics.profiles.length > 0) || !!basics.email;

  return (
    <section className="idcard">
      <div className="idcard-label">~/{slug} · adapted for {slug}</div>
      <h1 className="idcard-name">
        {basics.name}
        <span className="caret">_</span>
      </h1>
      {roleBits && <div className="idcard-role">{roleBits}</div>}
      {oneLiner && (
        <p className="idcard-oneliner">
          <span className="idcard-comment">{'// '}</span>
          {oneLiner}
        </p>
      )}
      {hasProfiles && (
        <div className="idcard-profiles">
          {basics.profiles?.map((p) => (
            <a key={p.network} href={p.url} target="_blank" rel="noreferrer">{p.network}</a>
          ))}
          {basics.email && <a href={`mailto:${basics.email}`}>{basics.email}</a>}
        </div>
      )}
    </section>
  );
}
