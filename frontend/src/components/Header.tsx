import { forwardRef, useEffect, useState } from 'react';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { FAVORITES_CHANGED_EVENT } from '../hooks/useFavorites';
import { fetchTotalFavoritesCount } from '../api/client';
import { getLastEventId } from '../lib/lastEvent';
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
    const eventId = currentEventId ?? getLastEventId();
    if (eventId) navigate(`/evento/${eventId}/favoritas`);
  }

  return (
    <header ref={ref} className="photip-header">
      <div className="photip-header__row">
        <div className="photip-header__logo" onClick={() => navigate('/')}>
          PHOTIP
        </div>

        {showBack && (
          <div className="photip-header__back">
            <button
              type="button"
              className="photip-header__back-btn"
              onClick={goBack}
              aria-label="Voltar"
            >
              ‹
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line
                x1="21"
                y1="21"
                x2="16.65"
                y2="16.65"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            type="button"
            className="photip-header__icon-btn photip-header__fav-btn"
            onClick={goFavorites}
            title="Favoritas"
            aria-label="Favoritas"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h2l1.6 9.6a2 2 0 0 0 2 1.7h7.6a2 2 0 0 0 2-1.6L20.6 9H7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="20" r="1.4" fill="currentColor" />
              <circle cx="17" cy="20" r="1.4" fill="currentColor" />
            </svg>
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && <NavDrawer onClose={() => setMenuOpen(false)} />}
    </header>
  );
});
