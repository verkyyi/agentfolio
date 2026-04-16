/**
 * Resume theme based on jsonresume-theme-developer-mono by Thomas Davis.
 * Adapted for client-side React rendering with inlined @resume/core components.
 */

import React from 'react';
import styled from 'styled-components';

/* ---------- Inlined @resume/core primitives ---------- */

const SectionWrapper = styled.section``;
const SectionTitleBase = styled.h2``;

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return <SectionWrapper className={className}>{children}</SectionWrapper>;
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <SectionTitleBase className={className}>{children}</SectionTitleBase>;
}

function formatDate(date: string | undefined): string {
  if (!date) return '';
  const parts = date.split('-');
  if (parts.length >= 2) {
    const d = new Date(`${parts[0]}-${parts[1]}-01`);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }
  return date;
}

function DateRange({
  startDate,
  endDate,
  className,
}: {
  startDate?: string;
  endDate?: string;
  className?: string;
}) {
  const start = formatDate(startDate);
  const end = endDate ? formatDate(endDate) : 'Present';
  if (!start) return null;
  return <span className={className}>{start} — {end}</span>;
}

function ContactInfo({ basics, className }: { basics: Record<string, any>; className?: string }) {
  const parts: React.ReactNode[] = [];
  if (basics.email) {
    parts.push(<a key="email" href={`mailto:${basics.email}`}>{basics.email as string}</a>);
  }
  if (basics.phone) {
    parts.push(<a key="phone" href={`tel:${basics.phone}`}>{basics.phone as string}</a>);
  }
  const location = basics.location as Record<string, string> | undefined;
  if (location) {
    const loc = [location.city, location.region].filter(Boolean).join(', ');
    if (loc) parts.push(<span key="loc">{loc}</span>);
  }
  const profiles = basics.profiles as Array<{ network: string; url: string }> | undefined;
  if (profiles) {
    for (const p of profiles) {
      parts.push(<a key={p.network} href={p.url} target="_blank" rel="noreferrer">{p.network}</a>);
    }
  }
  if (basics.url) {
    parts.push(<a key="url" href={basics.url as string} target="_blank" rel="noreferrer">{basics.url as string}</a>);
  }
  return (
    <div className={className}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && ' · '}
          {part}
        </React.Fragment>
      ))}
    </div>
  );
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
}

/* ---------- Styled components from developer-mono theme ---------- */

const Layout = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 60px 50px;
  background: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1f2937;
  line-height: 1.7;

  @media print {
    padding: 40px;
  }

  @media (max-width: 640px) {
    padding: 40px 20px;
  }
`;

const Header = styled.header`
  margin-bottom: 48px;
  padding-bottom: 24px;
  border-bottom: 3px solid #2563eb;
`;

const Name = styled.h1`
  font-size: 48px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  color: #111827;
  margin: 0 0 12px 0;
  letter-spacing: -1px;
`;

const Label = styled.p`
  font-size: 18px;
  font-weight: 500;
  font-family: 'JetBrains Mono', monospace;
  color: #2563eb;
  margin: 0 0 20px 0;
  letter-spacing: 0.5px;
`;

const StyledContactInfo = styled(ContactInfo)`
  font-size: 15px;
  color: #6b7280;
  margin-bottom: 20px;

  a {
    font-size: 15px;
    color: #2563eb;
    text-decoration: none;
    font-family: 'JetBrains Mono', monospace;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const Summary = styled.p`
  font-size: 16px;
  line-height: 1.8;
  color: #374151;
  margin: 20px 0 0 0;
  max-width: 750px;
`;

const StyledSection = styled(Section)`
  margin-bottom: 48px;
`;

const StyledSectionTitle = styled(SectionTitle)`
  font-size: 20px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  color: #111827;
  margin: 0 0 24px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 8px 0;
  border-bottom: 2px solid #e5e7eb;
  display: inline-block;
  min-width: 200px;

  &::before {
    content: '# ';
    color: #2563eb;
  }
`;

const WorkItem = styled.div`
  margin-bottom: 36px;
  padding-left: 20px;
  border-left: 3px solid #e5e7eb;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    border-left-color: #2563eb;
  }
`;

const WorkHeader = styled.div`
  margin-bottom: 12px;
`;

const WorkTitle = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
`;

const Position = styled.h3`
  font-size: 18px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  color: #111827;
  margin: 0;
`;

const Company = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: #2563eb;
  margin-top: 4px;
`;

const StyledDateRange = styled(DateRange)`
  font-size: 14px;
  font-family: 'JetBrains Mono', monospace;
  color: #6b7280;
`;

const WorkSummary = styled.p`
  margin: 12px 0;
  color: #4b5563;
  line-height: 1.7;
  font-size: 15px;
`;

const HighlightsList = styled.ul`
  margin: 12px 0 0 0;
  padding-left: 20px;
  list-style: none;

  li {
    position: relative;
    margin-bottom: 8px;
    padding-left: 0;
    color: #374151;
    line-height: 1.7;

    &::before {
      content: '\u2192';
      position: absolute;
      left: -20px;
      color: #2563eb;
      font-weight: bold;
    }
  }
`;

const EducationItem = styled.div`
  margin-bottom: 28px;
  padding: 20px;
  background: #f9fafb;
  border-left: 3px solid #2563eb;
  border-radius: 2px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const EducationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
`;

const Degree = styled.h3`
  font-size: 17px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  color: #111827;
  margin: 0;
`;

const Institution = styled.div`
  font-size: 15px;
  color: #6b7280;
  margin-top: 4px;
`;

const StudyType = styled.div`
  font-size: 14px;
  color: #2563eb;
  margin-top: 4px;
`;

const SkillsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
`;

const SkillCard = styled.div`
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 2px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #2563eb;
    background: #eff6ff;
  }
`;

const SkillName = styled.h4`
  font-size: 15px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  color: #111827;
  margin: 0 0 10px 0;
`;

const KeywordList = styled.div`
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;
`;

const ProjectItem = styled.div`
  margin-bottom: 32px;
  padding-bottom: 32px;
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
  }
`;

const ProjectHeader = styled.div`
  margin-bottom: 12px;
`;

const ProjectName = styled.h3`
  font-size: 17px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  color: #111827;
  margin: 0 0 8px 0;
`;

const ProjectDescription = styled.p`
  font-size: 15px;
  color: #4b5563;
  line-height: 1.7;
  margin: 0;
`;

const ProjectHighlights = styled.ul`
  margin: 12px 0 0 0;
  padding-left: 20px;
  list-style: none;

  li {
    position: relative;
    margin-bottom: 6px;
    padding-left: 0;
    color: #4b5563;
    font-size: 14px;

    &::before {
      content: '\u2022';
      position: absolute;
      left: -20px;
      color: #2563eb;
    }
  }
`;

const SimpleList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
`;

const SimpleItem = styled.div`
  padding: 16px;
  background: #f9fafb;
  border-left: 2px solid #2563eb;
  border-radius: 2px;
`;

const ItemTitle = styled.h4`
  font-size: 15px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  color: #111827;
  margin: 0 0 8px 0;
`;

const ItemMeta = styled.div`
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 6px;
`;

const ItemDescription = styled.p`
  font-size: 14px;
  color: #4b5563;
  margin: 8px 0 0 0;
  line-height: 1.6;
`;

/* ---------- Resume component ---------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ResumeProps {
  resume: Record<string, any>;
}

export function ResumeTheme({ resume }: ResumeProps) {
  const basics = (resume.basics || {}) as Record<string, any>;
  const work = (resume.work || []) as Array<Record<string, any>>;
  const education = (resume.education || []) as Array<Record<string, any>>;
  const skills = (resume.skills || []) as Array<Record<string, any>>;
  const projects = (resume.projects || []) as Array<Record<string, any>>;
  const volunteer = (resume.volunteer || []) as Array<Record<string, any>>;
  const awards = (resume.awards || []) as Array<Record<string, any>>;
  const publications = (resume.publications || []) as Array<Record<string, any>>;
  const languages = (resume.languages || []) as Array<Record<string, any>>;
  const interests = (resume.interests || []) as Array<Record<string, any>>;
  const references = (resume.references || []) as Array<Record<string, any>>;

  return (
    <Layout>
      <Header>
        <Name>{basics.name as string}</Name>
        {basics.label && <Label>{basics.label as string}</Label>}
        <StyledContactInfo basics={basics} />
        {basics.summary && <Summary>{basics.summary as string}</Summary>}
      </Header>

      {work.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>Experience</StyledSectionTitle>
          {work.map((job, index) => (
            <WorkItem key={index}>
              <WorkHeader>
                <WorkTitle>
                  <div>
                    <Position>{job.position as string}</Position>
                    <Company>{job.name as string}</Company>
                  </div>
                  <StyledDateRange startDate={job.startDate as string} endDate={job.endDate as string} />
                </WorkTitle>
              </WorkHeader>
              {job.summary && <WorkSummary>{job.summary as string}</WorkSummary>}
              {(job.highlights as string[] | undefined)?.length ? (
                <HighlightsList>
                  {(job.highlights as string[]).map((h, i) => <li key={i}>{h}</li>)}
                </HighlightsList>
              ) : null}
            </WorkItem>
          ))}
        </StyledSection>
      )}

      {skills.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>Skills</StyledSectionTitle>
          <SkillsGrid>
            {skills.map((skill, index) => (
              <SkillCard key={index}>
                <SkillName>{skill.name as string}</SkillName>
                {(skill.keywords as string[] | undefined)?.length ? (
                  <KeywordList>{(skill.keywords as string[]).join(' \u2022 ')}</KeywordList>
                ) : null}
              </SkillCard>
            ))}
          </SkillsGrid>
        </StyledSection>
      )}

      {education.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>Education</StyledSectionTitle>
          {education.map((edu, index) => (
            <EducationItem key={index}>
              <EducationHeader>
                <div>
                  <Degree>{edu.area as string}</Degree>
                  {edu.studyType && <StudyType>{edu.studyType as string}</StudyType>}
                  <Institution>{edu.institution as string}</Institution>
                </div>
                <StyledDateRange startDate={edu.startDate as string} endDate={edu.endDate as string} />
              </EducationHeader>
              {edu.score && <ItemMeta>GPA: {edu.score as string}</ItemMeta>}
              {(edu.courses as string[] | undefined)?.length ? (
                <ItemDescription>{(edu.courses as string[]).join(', ')}</ItemDescription>
              ) : null}
            </EducationItem>
          ))}
        </StyledSection>
      )}

      {projects.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>Projects</StyledSectionTitle>
          {projects.map((project, index) => (
            <ProjectItem key={index}>
              <ProjectHeader>
                <ProjectName>
                  {project.url ? (
                    <Link href={project.url as string}>{project.name as string}</Link>
                  ) : (
                    project.name as string
                  )}
                </ProjectName>
                {project.description && <ProjectDescription>{project.description as string}</ProjectDescription>}
              </ProjectHeader>
              {(project.highlights as string[] | undefined)?.length ? (
                <ProjectHighlights>
                  {(project.highlights as string[]).map((h, i) => <li key={i}>{h}</li>)}
                </ProjectHighlights>
              ) : null}
            </ProjectItem>
          ))}
        </StyledSection>
      )}

      {volunteer.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>Volunteer</StyledSectionTitle>
          <SimpleList>
            {volunteer.map((vol, index) => (
              <SimpleItem key={index}>
                <ItemTitle>{vol.position as string}</ItemTitle>
                <ItemMeta>
                  {vol.organization as string}
                  {vol.startDate && (
                    <> {' \u2022 '}<DateRange startDate={vol.startDate as string} endDate={vol.endDate as string} /></>
                  )}
                </ItemMeta>
                {vol.summary && <ItemDescription>{vol.summary as string}</ItemDescription>}
              </SimpleItem>
            ))}
          </SimpleList>
        </StyledSection>
      )}

      {awards.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>Awards</StyledSectionTitle>
          <SimpleList>
            {awards.map((award, index) => (
              <SimpleItem key={index}>
                <ItemTitle>{award.title as string}</ItemTitle>
                <ItemMeta>
                  {award.awarder as string}
                  {award.date && <> {' \u2022 '} {award.date as string}</>}
                </ItemMeta>
                {award.summary && <ItemDescription>{award.summary as string}</ItemDescription>}
              </SimpleItem>
            ))}
          </SimpleList>
        </StyledSection>
      )}

      {publications.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>Publications</StyledSectionTitle>
          {publications.map((pub, index) => (
            <ProjectItem key={index}>
              <ProjectHeader>
                <ProjectName>
                  {pub.url ? <Link href={pub.url as string}>{pub.name as string}</Link> : pub.name as string}
                </ProjectName>
                <ItemMeta>
                  {pub.publisher as string}
                  {pub.releaseDate && <> {' \u2022 '} {pub.releaseDate as string}</>}
                </ItemMeta>
              </ProjectHeader>
              {pub.summary && <ProjectDescription>{pub.summary as string}</ProjectDescription>}
            </ProjectItem>
          ))}
        </StyledSection>
      )}

      {languages.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>Languages</StyledSectionTitle>
          <SimpleList>
            {languages.map((lang, index) => (
              <SimpleItem key={index}>
                <ItemTitle>{lang.language as string}</ItemTitle>
                {lang.fluency && <ItemMeta>{lang.fluency as string}</ItemMeta>}
              </SimpleItem>
            ))}
          </SimpleList>
        </StyledSection>
      )}

      {interests.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>Interests</StyledSectionTitle>
          <SimpleList>
            {interests.map((interest, index) => (
              <SimpleItem key={index}>
                <ItemTitle>{interest.name as string}</ItemTitle>
                {(interest.keywords as string[] | undefined)?.length ? (
                  <ItemDescription>{(interest.keywords as string[]).join(', ')}</ItemDescription>
                ) : null}
              </SimpleItem>
            ))}
          </SimpleList>
        </StyledSection>
      )}

      {references.length > 0 && (
        <StyledSection>
          <StyledSectionTitle>References</StyledSectionTitle>
          {references.map((ref, index) => (
            <ProjectItem key={index}>
              <ItemTitle>{ref.name as string}</ItemTitle>
              {ref.reference && <ItemDescription>{ref.reference as string}</ItemDescription>}
            </ProjectItem>
          ))}
        </StyledSection>
      )}
    </Layout>
  );
}
