import { useCallback, useEffect, useState } from 'react';
import { addFavorite, clearEventFavorites, fetchEventFavorites, removeFavorite } from '../api/client';

export const FAVORITES_CHANGED_EVENT = 'potof:favorites-changed';

export function useFavorites(eventId: string) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetchEventFavorites(eventId)
      .then(({ fotoIds }) => {
        if (!cancelled) setFavorites(new Set(fotoIds));
      })
      .catch((err) => console.error('[useFavorites] falha ao buscar favoritos do evento', err));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // Notifies the header badge whenever the local set changes — kept out of the
  // state updater below (same reasoning as before the backend migration): a
  // synchronous dispatch inside a setState updater let Header's listener call
  // its own setState mid-update, which React flags as an illegal cross-component
  // render-phase update.
  useEffect(() => {
    window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
  }, [favorites]);

  const toggleFavorite = useCallback(
    (photoId: string) => {
      const wasFavorite = favorites.has(photoId);

      // Optimistic: the UI updates immediately, the API call happens in the
      // background. Waiting for the round-trip on every tap would introduce
      // noticeable lag when favoriting several photos in a row.
      setFavorites((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(photoId);
        else next.add(photoId);
        return next;
      });

      const request = wasFavorite ? removeFavorite(eventId, photoId) : addFavorite(eventId, photoId);
      request.catch((err) => {
        console.error('[useFavorites] falha ao sincronizar favorito, revertendo', err);
        setFavorites((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(photoId);
          else next.delete(photoId);
          return next;
        });
      });
    },
    [eventId, favorites]
  );

  const isFavorite = useCallback((photoId: string) => favorites.has(photoId), [favorites]);

  const clearFavorites = useCallback(() => {
    setFavorites(new Set());
    clearEventFavorites(eventId).catch((err) =>
      console.error('[useFavorites] falha ao limpar favoritos no backend', err)
    );
  }, [eventId]);

  return { favorites, toggleFavorite, isFavorite, clearFavorites };
}
