/**
 * Instruction markdown whitelist renderer tests: the constructs the
 * backend-authored guides use render as elements; everything else stays
 * literal text (no HTML execution path exists).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderInstructionsMarkdown } from './instructions-markdown';

describe('renderInstructionsMarkdown', () => {
  it('renders fenced code blocks and strips the ngx {:copy-code} marker', () => {
    const { container } = render(
      <div>
        {renderInstructionsMarkdown(
          '```bash\nsudo apt update\n{:copy-code}\n```',
        )}
      </div>,
    );
    const code = container.querySelector('pre code');
    expect(code?.textContent).toBe('sudo apt update');
  });

  it('maps headings, bold, inline code and http anchors to elements', () => {
    render(
      <div>
        {renderInstructionsMarkdown(
          '#### Prerequisites\n\nInstall **Docker CE** and `compose`, see <a href="https://docs.docker.com/" target="_blank"> docs</a>.',
        )}
      </div>,
    );
    expect(
      screen.getByRole('heading', { name: 'Prerequisites' }),
    ).toBeInTheDocument();
    const anchor = screen.getByRole('link', { name: 'docs' });
    expect(anchor).toHaveAttribute('href', 'https://docs.docker.com/');
    expect(screen.getByText('Docker CE').tagName).toBe('STRONG');
    expect(screen.getByText('compose').tagName).toBe('CODE');
  });

  it('keeps non-http anchors and unknown markup as literal text', () => {
    const { container } = render(
      <div>
        {renderInstructionsMarkdown(
          'see <a href="javascript:alert(1)">bad</a> and <script>x</script>',
        )}
      </div>,
    );
    // No anchor/script element ever materializes: unsafe hrefs drop to their
    // text label, unknown tags render as escaped text.
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText(/bad/)).toBeInTheDocument();
    expect(screen.getByText(/<script>x<\/script>/)).toBeInTheDocument();
  });

  it('groups consecutive list items into one list', () => {
    const { container } = render(
      <div>{renderInstructionsMarkdown('- one\n- two\nplain')}</div>,
    );
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });
});
