import styled from 'styled-components';

const FooterWrapper = styled.footer`
  max-width: 800px;
  margin: 40px auto 24px;
  padding: 16px 40px 0;
  border-top: 1px solid var(--border-soft);
  font-family: inherit;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.6;

  a {
    color: var(--text-muted);
    text-decoration: underline;
    text-decoration-color: var(--border);
  }

  a:hover {
    color: var(--accent-blue);
    text-decoration-color: var(--accent-blue);
  }

  @media print {
    display: none;
  }
`;

export function Footer() {
  return (
    <FooterWrapper>
      Built with{' '}
      <a href="https://github.com/verkyyi/agentfolio" target="_blank" rel="noopener noreferrer">
        AgentFolio
      </a>
      {' · '}
      Resume schema:{' '}
      <a href="https://jsonresume.org/" target="_blank" rel="noopener noreferrer">
        JSON Resume
      </a>
    </FooterWrapper>
  );
}
