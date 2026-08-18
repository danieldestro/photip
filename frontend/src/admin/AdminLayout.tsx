import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAdminAuth } from './AdminAuthContext';

const NAV_ITEMS = [
  { to: '/admin/provedores', label: 'Provedores' },
  { to: '/admin/categorias', label: 'Categorias' },
  { to: '/admin/eventos', label: 'Eventos' },
  { to: '/admin/usuarios', label: 'Usuários' },
  { to: '/admin/fotografos', label: 'Fotógrafos' },
  { to: '/admin/fotos', label: 'Fotos' },
  { to: '/admin/sincronizacoes', label: 'Sincronizações' },
  { to: '/admin/configuracoes', label: 'Configurações' },
];

export function AdminLayout() {
  const { admin, loading, logout } = useAdminAuth();

  if (loading) {
    return <div className="admin-loading">Carregando…</div>;
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <Logo />
          <span className="admin-sidebar__brand-label">admin</span>
        </div>
        <nav className="admin-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `admin-sidebar__link${isActive ? ' admin-sidebar__link--active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <span className="admin-sidebar__user">{admin.nome} - v{__APP_VERSION__}</span>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => void logout()}>
            Sair
          </button>
        </div>
        {/* <div className="admin-sidebar__version">v{__APP_VERSION__}</div> */}
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
