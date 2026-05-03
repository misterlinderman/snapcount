import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
}

/**
 * Centered column matching POC max-width + horizontal padding from tokens.
 */
function PageShell({ children }: PageShellProps) {
  return (
    <div
      className="mx-auto w-full px-[var(--shell-pad-x)] py-[var(--shell-pad-y)]"
      style={{ maxWidth: 'var(--shell-max-width)' }}
    >
      {children}
    </div>
  );
}

export default PageShell;
