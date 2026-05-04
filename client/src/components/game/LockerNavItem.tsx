import type { ReactNode } from 'react';

export interface LockerNavItemProps {
  icon: ReactNode;
  label: string;
  description?: string;
  active: boolean;
  onClick: () => void;
}

function LockerNavItem({ icon, label, description, active, onClick }: LockerNavItemProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-1 items-center gap-3 rounded-r-md py-2.5 pl-3 pr-2 text-left transition-colors sm:gap-3 sm:py-2.5 sm:pl-3.5"
      style={{
        background: active ? 'var(--bg-overlay)' : 'transparent',
        borderLeft: `3px solid ${active ? 'var(--blitz-red)' : 'transparent'}`,
      }}
    >
      <div className="flex w-6 shrink-0 justify-center text-lg sm:text-xl" aria-hidden>
        {icon}
      </div>
      <div className="min-w-0">
        <div
          className="text-sm font-bold tracking-wide"
          style={{
            fontFamily: 'var(--font-display)',
            color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
            letterSpacing: '0.03em',
          }}
        >
          {label}
        </div>
        {description ? (
          <div className="mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {description}
          </div>
        ) : null}
      </div>
    </button>
  );
}

export default LockerNavItem;
