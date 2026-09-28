import { useDispatch } from 'react-redux';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { signOut } from '../../features/auth/signOut';
import { useAuth } from '../../hooks/useAuth';

export function AppLayout() {
  const dispatch = useDispatch();
  const { user, isAdmin } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/" className="brand">Mini Jira</Link>
          <nav className="nav" aria-label="Main">
            <NavLink to="/" end>Tasks</NavLink>
            <NavLink to="/projects">Projects</NavLink>
            <NavLink to="/teams">Teams</NavLink>
            {isAdmin && <NavLink to="/users">Users</NavLink>}
          </nav>
          <div className="topbar__user">
            <NavLink to="/account" className="topbar__name" title="Account settings">
              {user.name} <span className="muted">({user.role})</span>
            </NavLink>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => dispatch(signOut())}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
