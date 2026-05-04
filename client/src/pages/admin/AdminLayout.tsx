import { NavLink, Outlet } from 'react-router-dom';

const LINKS = [
  { to: 'dashboard', label: 'Dashboard' },
  { to: 'cards', label: 'Cards' },
  { to: 'playmakers', label: 'Playmakers' },
  { to: 'upgrades', label: 'Upgrades' },
  { to: 'matchups', label: 'Matchups' },
  { to: 'users', label: 'Users' },
  { to: 'sessions', label: 'Sessions' },
  { to: 'audit', label: 'Audit' },
] as const;

function AdminLayout(): JSX.Element {
  return (
    <div className="flex flex-col gap-8 pb-12 md:flex-row md:items-start md:gap-10">
      <aside className="shrink-0 md:w-56">
        <nav
          className="flex flex-col gap-0.5 rounded border p-3 md:sticky md:top-20"
          style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--surface-panel)' }}
          aria-label="Admin navigation"
        >
          <p
            className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ color: 'var(--muted)', fontFamily: 'var(--font-playfair-sc)' }}
          >
            Console
          </p>
          {LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className="block min-h-10 rounded px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2"
              style={({ isActive }) => ({
                fontFamily: 'var(--font-serif)',
                backgroundColor: isActive ? 'var(--cream)' : 'transparent',
                color: isActive ? 'var(--blue)' : 'var(--ink)',
                borderLeft: isActive ? '3px solid var(--blue)' : '3px solid transparent',
                boxShadow: isActive ? undefined : 'none',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;
