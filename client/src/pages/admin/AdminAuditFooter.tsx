import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/services/adminApi';

export type AdminAuditScope = 'cards' | 'playmakers' | 'upgrades';

interface AdminAuditFooterProps {
  scope: AdminAuditScope;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function AdminAuditFooter({ scope }: AdminAuditFooterProps): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', 'latest', scope],
    queryFn: () => adminApi.audit.latest(scope),
  });

  if (isLoading) {
    return (
      <footer className="mt-10 border-t pt-4 text-sm" style={{ borderColor: 'var(--rule)', color: 'var(--muted)' }}>
        Loading audit…
      </footer>
    );
  }

  if (!data) {
    return (
      <footer className="mt-10 border-t pt-4 text-sm" style={{ borderColor: 'var(--rule)', color: 'var(--muted)' }}>
        No catalog changes recorded yet.
      </footer>
    );
  }

  return (
    <footer
      className="mt-10 border-t pt-4 text-sm"
      style={{ borderColor: 'var(--rule)', color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}
    >
      Last edited by <span style={{ color: 'var(--ink)' }}>{data.actor}</span> at {formatWhen(data.timestamp)}{' '}
      <span className="font-mono text-xs" style={{ color: 'var(--ink2)' }}>
        ({data.action} · {data.target})
      </span>
    </footer>
  );
}

export default AdminAuditFooter;