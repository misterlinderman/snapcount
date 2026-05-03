import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Loading from './Loading';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';

interface RequireAdminProps {
  children: ReactNode;
}

function RequireAdmin({ children }: RequireAdminProps) {
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const { isAdmin, isLoading: meLoading } = useRequireAdmin();

  if (authLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    loginWithRedirect();
    return <Loading />;
  }

  if (meLoading) {
    return <Loading />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default RequireAdmin;
