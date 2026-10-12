import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const LINKS = [
  { to: '/', label: 'Aprender', icon: '🏠', end: true },
  { to: '/notebook', label: 'Libreta', icon: '📒' },
  { to: '/progress', label: 'Progreso', icon: '📈' },
  { to: '/profile', label: 'Perfil', icon: '👤' },
];

export function Layout() {
  const { me, logout } = useAuth();
  const inLesson = useLocation().pathname.startsWith('/lesson/');
  return (
    <div className={`app ${inLesson ? 'in-lesson' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">🗣️</span>
          <span>Mi profe de inglés</span>
        </div>
        <nav className="nav">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
              <span className="nav-icon">{l.icon}</span>
              <span className="nav-label">{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="topbar-user">
          <span className="level-pill">{me?.profile?.cefrLevel ?? 'A2'}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
