import { ReactNode } from 'react';
import Masthead from './game/Masthead';
import RogueBar from './game/RogueBar';
import PageShell from './game/PageShell';
import Navbar from './Navbar';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: 'var(--cream)', color: 'var(--ink)' }}
    >
      <Masthead />
      <RogueBar />
      <Navbar />
      <main className="flex-1">
        <PageShell>{children}</PageShell>
      </main>
      <footer
        className="border-t py-6"
        style={{
          backgroundColor: 'var(--white)',
          borderColor: 'var(--rule)',
          color: 'var(--muted)',
        }}
      >
        <PageShell>
          <p className="text-center text-sm" style={{ fontFamily: 'var(--font-serif)' }}>
            &copy; {new Date().getFullYear()} Gridiron Rogue
          </p>
        </PageShell>
      </footer>
    </div>
  );
}

export default Layout;
