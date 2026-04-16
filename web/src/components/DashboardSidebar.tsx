import styled from 'styled-components';

export interface FittedEntry {
  slug: string;
  filename: string;
}

interface Props {
  items: FittedEntry[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}

const Aside = styled.aside`
  width: 220px;
  min-height: 100vh;
  border-right: 1px solid var(--rule);
  padding: 24px 0;
  background: var(--paper-deep);
`;

const Heading = styled.h2`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-mute);
  padding: 0 16px;
  margin: 0 0 12px;
`;

const Item = styled.button<{ $active: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 16px;
  background: ${({ $active }) => ($active ? 'var(--highlight)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--accent-ink)' : 'var(--ink-soft)')};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  border: none;
  cursor: pointer;
  transition: background 120ms ease;

  &:hover {
    background: ${({ $active }) => ($active ? 'var(--highlight)' : 'var(--rule)')};
  }
`;

export function DashboardSidebar({ items, activeSlug, onSelect }: Props) {
  return (
    <Aside>
      <Heading>Fitted Resumes</Heading>
      {items.map((item) => (
        <Item
          key={item.slug}
          $active={item.slug === activeSlug}
          data-active={item.slug === activeSlug}
          onClick={() => onSelect(item.slug)}
        >
          {item.slug}
        </Item>
      ))}
    </Aside>
  );
}
