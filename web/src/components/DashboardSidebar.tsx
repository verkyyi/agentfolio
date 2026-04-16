import styled from 'styled-components';

export interface FittedEntry {
  slug: string;
  filename: string;
  label?: string;
}

interface Props {
  items: FittedEntry[];
  activeSlug: string;
  onSelect: (slug: string) => void;
  onDirectives?: () => void;
  directivesActive?: boolean;
}

const Aside = styled.aside`
  width: 260px;
  height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;
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
  line-height: 1.4;

  &:hover {
    background: ${({ $active }) => ($active ? 'var(--highlight)' : 'var(--rule)')};
  }
`;

const ItemLabel = styled.span`
  display: block;
  font-size: 11px;
  font-weight: 400;
  color: var(--ink-mute);
  margin-top: 2px;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--rule);
  margin: 16px 0;
`;

export function DashboardSidebar({ items, activeSlug, onSelect, onDirectives, directivesActive }: Props) {
  return (
    <Aside>
      <Heading>Fitted Resumes</Heading>
      {items.map((item) => (
        <Item
          key={item.slug}
          $active={!directivesActive && item.slug === activeSlug}
          data-active={!directivesActive && item.slug === activeSlug}
          onClick={() => onSelect(item.slug)}
        >
          {item.slug}
          {item.label && item.label !== item.slug && <ItemLabel>{item.label}</ItemLabel>}
        </Item>
      ))}
      {onDirectives && (
        <>
          <Divider />
          <Heading>Settings</Heading>
          <Item
            $active={!!directivesActive}
            data-active={!!directivesActive}
            onClick={onDirectives}
          >
            Directives
          </Item>
        </>
      )}
    </Aside>
  );
}
