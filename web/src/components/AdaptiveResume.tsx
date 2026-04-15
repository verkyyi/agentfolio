import type { AdaptedResume, BaseResume, SectionName, VisitorContext } from '../types';
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
  base: BaseResume;
  adapted: AdaptedResume;
  context: VisitorContext;
  onCtaClick?: (target: 'email' | 'linkedin' | 'github') => void;
  onProjectClick?: (projectId: string, link: 'url' | 'github') => void;
  onSectionDwell?: (section: SectionName, ms: number) => void;
}

export function AdaptiveResume({
  base,
  adapted,
  context,
  onCtaClick,
  onProjectClick,
  onSectionDwell,
}: Props) {
  const renderers: Record<SectionName, () => React.ReactElement> = {
    summary: () => <SummarySection summary={adapted.summary} />,
    experience: () => (
      <ExperienceSection
        experience={base.experience}
        order={adapted.experience_order}
        bulletOverrides={adapted.bullet_overrides}
      />
    ),
    projects: () => (
      <ProjectsSection
        projects={base.projects}
        order={adapted.project_order}
        onProjectClick={onProjectClick}
      />
    ),
    skills: () => (
      <SkillsSection groups={base.skills.groups} emphasis={adapted.skill_emphasis} />
    ),
    education: () => <EducationSection education={base.education} />,
    volunteering: () => <VolunteeringSection items={base.volunteering} />,
  };

  return (
    <main className="resume">
      <header>
        <h1>{base.name}</h1>
        <p>
          {base.contact.location} ·{' '}
          <a
            href={`mailto:${base.contact.email}`}
            onClick={() => onCtaClick?.('email')}
          >
            {base.contact.email}
          </a>{' '}
          ·{' '}
          <a href={base.contact.linkedin} onClick={() => onCtaClick?.('linkedin')}>
            LinkedIn
          </a>{' '}
          ·{' '}
          <a href={base.contact.github} onClick={() => onCtaClick?.('github')}>
            GitHub
          </a>
        </p>
        <DebugPanel context={context} adapted={adapted} />
        <MatchScoreBar score={adapted.match_score} />
      </header>
      {adapted.section_order.map((name) => {
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
