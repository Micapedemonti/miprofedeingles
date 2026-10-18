import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';

const LINKS: Array<{ to: string; label: string; icon: IconName; end?: boolean }> = [
  { to: '/', label: 'Aprender', icon: 'home', end: true },
  { to: '/notebook', label: 'Libreta', icon: 'book' },
  { to: '/progress', label: 'Progreso', icon: 'chart' },
  { to: '/profile', label: 'Perfil', icon: 'user' },
];

export function Layout() {
  const { me, logout } = useAuth();
  const inLesson = useLocation().pathname.startsWith('/lesson/');
  return (
    <div className={`app ${inLesson ? 'in-lesson' : ''}`}>
      <header className="topbar">
        <Link to="/" aria-label="Mi profe de inglés, inicio">
          <Logo />
        </Link>
        <nav className="nav" aria-label="Principal">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
              <Icon name={l.icon} size={24} className="nav-icon" />
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
