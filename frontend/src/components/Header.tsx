import { forwardRef, useEffect, useState } from 'react';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { ChevronLeft, Menu, Search, ShoppingCart } from 'lucide-react';
import { FAVORITES_CHANGED_EVENT } from '../hooks/useFavorites';
import { fetchTotalFavoritesCount } from '../api/client';
import { Logo } from './Logo';
import { NavDrawer } from './NavDrawer';

interface HeaderProps {
  eventTitle: string | null;
}

export const Header = forwardRef<HTMLElement, HeaderProps>(function Header({ eventTitle }, ref) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [totalFavorites, setTotalFavorites] = useState(0);

  const eventoMatch = useMatch('/evento/:eventId');
  const favoritasMatch = useMatch('/evento/:eventId/favoritas');
  const checkoutMatch = useMatch('/evento/:eventId/checkout');
  const isHome = location.pathname === '/';

  useEffect(() => {
    let cancelled = false;
    function refresh() {
      fetchTotalFavoritesCount()
        .then(({ total }) => {
          if (!cancelled) setTotalFavorites(total);
        })
        .catch((err) => console.error('[Header] falha ao buscar total de favoritos', err));
    }
    refresh();
    window.addEventListener(FAVORITES_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(FAVORITES_CHANGED_EVENT, refresh);
    };
  }, [location.pathname]);

  const currentEventId =
    eventoMatch?.params.eventId ?? favoritasMatch?.params.eventId ?? checkoutMatch?.params.eventId ?? null;

  const showBack = !isHome;
  const headerTitle = eventoMatch || favoritasMatch ? (eventTitle ?? '') : '';

  function goBack() {
    if (checkoutMatch) navigate(`/evento/${checkoutMatch.params.eventId}/favoritas`);
    else if (favoritasMatch) navigate(`/evento/${favoritasMatch.params.eventId}`);
    else navigate('/');
  }

  function goFavorites() {
    if (currentEventId) navigate(`/evento/${currentEventId}/favoritas`);
    else navigate('/favoritas');
  }

  return (
    <header ref={ref} className="photip-header">
      <div className="photip-header__row">
        <div className="photip-header__logo" onClick={() => navigate('/')}>
          <Logo />
        </div>

        {showBack && (
          <div className="photip-header__back">
            <button
              type="button"
              className="photip-header__back-btn"
              onClick={goBack}
              aria-label="Voltar"
            >
              <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>
            <span className="photip-header__title">{headerTitle}</span>
          </div>
        )}

        <div className="photip-header__actions">
          <button
            type="button"
            className="photip-header__icon-btn"
            onClick={() => navigate('/eventos')}
            title="Buscar eventos"
            aria-label="Buscar"
          >
            <Search size={22} strokeWidth={2} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="photip-header__icon-btn photip-header__fav-btn"
            onClick={goFavorites}
            title="Favoritas"
            aria-label="Favoritas"
          >
            <ShoppingCart size={22} strokeWidth={2} aria-hidden="true" />
            {totalFavorites > 0 && (
              <span className="photip-header__fav-badge">{totalFavorites}</span>
            )}
          </button>

          <button
            type="button"
            className="photip-header__icon-btn"
            onClick={() => setMenuOpen(true)}
            title="Menu"
            aria-label="Menu"
          >
            <Menu size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      {menuOpen && <NavDrawer onClose={() => setMenuOpen(false)} />}
    </header>
  );
});
