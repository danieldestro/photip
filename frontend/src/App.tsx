import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { EventoPage } from './pages/EventoPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { FavoritasRedirect } from './pages/FavoritasRedirect';
import { CheckoutPage } from './pages/CheckoutPage';
import { LegalPage } from './pages/LegalPage';
import { AdminAuthProvider } from './admin/AdminAuthContext';
import { AdminLayout } from './admin/AdminLayout';
import { LoginPage } from './admin/pages/LoginPage';
import { ProvedoresPage } from './admin/pages/ProvedoresPage';
import { CategoriasPage } from './admin/pages/CategoriasPage';
import { EventosPage } from './admin/pages/EventosPage';
import { UsuariosPage } from './admin/pages/UsuariosPage';
import { FotografosPage } from './admin/pages/FotografosPage';
import { FotosPage } from './admin/pages/FotosPage';
import { ConfiguracoesPage } from './admin/pages/ConfiguracoesPage';
import { SincronizacoesLogPage } from './admin/pages/SincronizacoesLogPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/eventos" element={<ExplorePage />} />
          <Route path="/evento/favoritas" element={<FavoritasRedirect />} />
          <Route path="/evento/:eventId" element={<EventoPage />} />
          <Route path="/evento/:eventId/favoritas" element={<FavoritesPage />} />
          <Route path="/evento/:eventId/checkout" element={<CheckoutPage />} />
          <Route path="/termos" element={<LegalPage title="Termos de Uso" />} />
          <Route path="/privacidade" element={<LegalPage title="Política de Privacidade" />} />
          <Route path="/cookies" element={<LegalPage title="Política de Cookies" />} />
        </Route>

        <Route
          path="/admin/*"
          element={
            <AdminAuthProvider>
              <Routes>
                <Route path="login" element={<LoginPage />} />
                <Route element={<AdminLayout />}>
                  <Route index element={<Navigate to="provedores" replace />} />
                  <Route path="provedores" element={<ProvedoresPage />} />
                  <Route path="categorias" element={<CategoriasPage />} />
                  <Route path="eventos" element={<EventosPage />} />
                  <Route path="usuarios" element={<UsuariosPage />} />
                  <Route path="fotografos" element={<FotografosPage />} />
                  <Route path="fotos" element={<FotosPage />} />
                  <Route path="sincronizacoes" element={<SincronizacoesLogPage />} />
                  <Route path="configuracoes" element={<ConfiguracoesPage />} />
                </Route>
              </Routes>
            </AdminAuthProvider>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
