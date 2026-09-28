import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '../ui';

export function ProtectedRoute({ roles }) {
  const { status, user } = useSelector((s) => s.auth);
  const location = useLocation();

  if (status === 'idle' || status === 'checking') return <Spinner label="Restoring your session" />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const status = useSelector((s) => s.auth.status);
  if (status === 'idle' || status === 'checking') return <Spinner label="Restoring your session" />;
  return status === 'authenticated' ? <Navigate to="/" replace /> : <Outlet />;
}
