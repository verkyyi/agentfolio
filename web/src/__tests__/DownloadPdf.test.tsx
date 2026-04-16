import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DownloadPdf } from '../components/DownloadPdf';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DownloadPdf', () => {
  it('renders download link when PDF exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));

    render(<DownloadPdf slug="notion" />);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /download pdf/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', expect.stringContaining('notion.pdf'));
      expect(link).toHaveAttribute('download');
    });
  });

  it('renders nothing when PDF does not exist', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));

    const { container } = render(<DownloadPdf slug="unknown" />);

    // Wait for the fetch to complete, then confirm nothing rendered
    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('uses default slug when none provided', async () => {
    const mockFetch = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', mockFetch);

    render(<DownloadPdf slug={null} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('default.pdf'),
        expect.objectContaining({ method: 'HEAD' })
      );
    });
  });
});
