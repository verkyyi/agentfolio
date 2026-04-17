import styled from 'styled-components';

const FooterWrapper = styled.footer`
  max-width: 800px;
  margin: 40px auto 24px;
  padding: 16px 40px 0;
  border-top: 1px solid #e5e7eb;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
  line-height: 1.6;

  a {
    color: #6b7280;
    text-decoration: underline;
    text-decoration-color: #d1d5db;
  }

  a:hover {
    color: #2563eb;
    text-decoration-color: #2563eb;
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
