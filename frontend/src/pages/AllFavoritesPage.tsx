import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFavoritedEvents } from '../api/client';
import { EventSummaryCard } from '../components/EventSummaryCard';
import type { FavoritedEventSummary } from '../types';

export function AllFavoritesPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<FavoritedEventSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFavoritedEvents()
      .then(({ events }) => {
        if (!cancelled) setEvents(events);
      })
      .catch((err) => {
        console.error('[AllFavoritesPage] falha ao buscar eventos com favoritos', err);
        if (!cancelled) setError('Não foi possível carregar seus favoritos agora.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="explore-page">
      <h1>Minhas favoritas</h1>

      {events === null && !error && <div className="home-recent-loading">Carregando…</div>}

      {error && <div className="home-recent-error">{error}</div>}

      {events && events.length === 0 && (
        <div className="explore-page__empty">
          <p>Você ainda não favoritou nenhuma foto.</p>
          <button type="button" className="photip-btn photip-btn--primary" onClick={() => navigate('/eventos')}>
            Explorar eventos
          </button>
        </div>
      )}

      {events && events.length > 0 && (
        <div className="event-grid">
          {events.map((event) => (
            <EventSummaryCard
              key={event.id}
              event={event}
              to={`/evento/${event.id}/favoritas`}
              extraBadge={
                <span className="photip-badge">
                  {event.favoritesCount} {event.favoritesCount === 1 ? 'favorita' : 'favoritas'}
                </span>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
