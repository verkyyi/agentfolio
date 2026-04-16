import type { AdaptedResume, SectionName, VisitorContext } from '../types';
import { SummarySection } from './SummarySection';
import { ExperienceSection } from './ExperienceSection';
import { ProjectsSection } from './ProjectsSection';
import { SkillsSection } from './SkillsSection';
import { EducationSection } from './EducationSection';
import { VolunteeringSection } from './VolunteeringSection';
import { MatchScoreBar } from './MatchScoreBar';
import { DebugPanel } from './DebugPanel';
import { SectionDwellTracker } from './SectionDwellTracker';

interface Props {
  adapted: AdaptedResume;
  context: VisitorContext;
  onCtaClick?: (target: 'email' | 'linkedin' | 'github') => void;
  onProjectClick?: (projectId: string, link: 'url' | 'github') => void;
  onSectionDwell?: (section: SectionName, ms: number) => void;
}

export function AdaptiveResume({
  adapted,
  context,
  onCtaClick,
  onProjectClick,
  onSectionDwell,
}: Props) {
  const af = adapted.meta?.agentfolio;
  const sectionOrder = af?.section_order ?? ['basics', 'work', 'projects', 'skills', 'education', 'volunteer'];
  const linkedIn = adapted.basics.profiles.find((p) => p.network === 'LinkedIn');
  const gitHub = adapted.basics.profiles.find((p) => p.network === 'GitHub');

  const renderers: Record<SectionName, () => React.ReactElement> = {
    basics: () => <SummarySection summary={adapted.basics.summary ?? ''} />,
    work: () => <ExperienceSection work={adapted.work} />,
    projects: () => (
      <ProjectsSection projects={adapted.projects} onProjectClick={onProjectClick} />
    ),
    skills: () => (
      <SkillsSection skills={adapted.skills} emphasis={af?.skill_emphasis ?? []} />
    ),
    education: () => <EducationSection education={adapted.education} />,
    volunteer: () => <VolunteeringSection items={adapted.volunteer} />,
  };

  return (
    <main className="resume">
      <header>
        <h1>{adapted.basics.name}</h1>
        <p>
          {adapted.basics.location.city}{adapted.basics.location.region ? `, ${adapted.basics.location.region}` : ''} ·{' '}
          <a href={`mailto:${adapted.basics.email}`} onClick={() => onCtaClick?.('email')}>
            {adapted.basics.email}
          </a>{' '}
          {linkedIn && (
            <>
              ·{' '}
              <a href={linkedIn.url} onClick={() => onCtaClick?.('linkedin')}>LinkedIn</a>{' '}
            </>
          )}
          {gitHub && (
            <>
              ·{' '}
              <a href={gitHub.url} onClick={() => onCtaClick?.('github')}>GitHub</a>
            </>
          )}
        </p>
        {context.company !== 'default' && af?.match_score && (
          <>
            <DebugPanel context={context} adapted={adapted} />
            <MatchScoreBar score={af.match_score} />
          </>
        )}
      </header>
      {sectionOrder.map((name) => {
        const render = renderers[name];
        if (!render) return null;
        if (onSectionDwell) {
          return (
            <SectionDwellTracker
              key={name}
              name={name}
              onDwell={(section, ms) => onSectionDwell(section as SectionName, ms)}
            >
              {render()}
            </SectionDwellTracker>
          );
        }
        return <div key={name}>{render()}</div>;
      })}
      <footer>
        <a href={`${import.meta.env.BASE_URL}how-it-works`}>How this works →</a>
      </footer>
    </main>
  );
}
