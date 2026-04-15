import type { AdaptedResume, BaseResume, SectionName, VisitorContext } from '../types';
import { SummarySection } from './SummarySection';
import { ExperienceSection } from './ExperienceSection';
import { ProjectsSection } from './ProjectsSection';
import { SkillsSection } from './SkillsSection';
import { EducationSection } from './EducationSection';
import { VolunteeringSection } from './VolunteeringSection';
import { MatchScoreBar } from './MatchScoreBar';
import { DebugPanel } from './DebugPanel';

interface Props {
  base: BaseResume;
  adapted: AdaptedResume;
  context: VisitorContext;
}

export function AdaptiveResume({ base, adapted, context }: Props) {
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
      <ProjectsSection projects={base.projects} order={adapted.project_order} />
    ),
    skills: () => (
      <SkillsSection groups={base.skills.groups} emphasis={adapted.skill_emphasis} />
    ),
    education: () => <EducationSection education={base.education} />,
    volunteering: () => <VolunteeringSection items={base.volunteering} />,
  };

  return (
    <main>
      <header>
        <h1>{base.name}</h1>
        <p>
          {base.contact.location} · <a href={`mailto:${base.contact.email}`}>{base.contact.email}</a>{' '}
          · <a href={base.contact.linkedin}>LinkedIn</a> · <a href={base.contact.github}>GitHub</a>
        </p>
        <DebugPanel context={context} adapted={adapted} />
        <MatchScoreBar score={adapted.match_score} />
      </header>
      {adapted.section_order.map((name) => {
        const render = renderers[name];
        if (!render) return null;
        return <div key={name}>{render()}</div>;
      })}
    </main>
  );
}
