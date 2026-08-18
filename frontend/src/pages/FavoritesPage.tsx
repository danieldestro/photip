import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { fetchEventInfo, fetchEventPhotos } from '../api/client';
import { useFavorites } from '../hooks/useFavorites';
import { useAppConfig } from '../hooks/useAppConfig';
import { getMockEventMeta } from '../data/exploreCatalog';
import { useCategorias } from '../hooks/useCategorias';
import { getCategoriaLabel } from '../lib/categorias';
import { formatDateLabel, formatLocationLabel, formatPhotosCount } from '../lib/eventDisplay';
import { getCachedEventInfo, setCachedEventInfo } from '../lib/eventInfoCache';
import { getCachedSearch, setCachedSearch } from '../lib/photoSearchCache';
import { PhotoViewer } from '../components/PhotoViewer';
import { PurchaseFooter } from '../components/PurchaseFooter';
import { UpsellBanner } from '../components/UpsellBanner';
import { CalendarIcon, CameraIcon, PinIcon } from '../components/icons';
import type { HeaderContext } from '../layouts/headerContext';
import type { EventHeaderInfo, Photo } from '../types';

export function FavoritesPage() {
  const { eventId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { setEventTitle } = useOutletContext<HeaderContext>();
  const { favorites, isFavorite, toggleFavorite } = useFavorites(eventId);
  const { aiPhotoEditEnabled } = useAppConfig();
  const { categorias } = useCategorias();

  const routerState = location.state as { photos?: Photo[]; event?: EventHeaderInfo } | null;
  const statePhotos = routerState?.photos ?? null;
  // Entry points without router state (the header's cart/favorites icon, direct URL
  // visits) fall back to the same in-memory cache EventoPage's own search fills —
  // avoids an unnecessary re-hit of /api/eventos/{id}/fotos when we already have the
  // photos from a search made moments earlier in this SPA session.
  const [allPhotos, setAllPhotos] = useState<Photo[] | null>(
    () => statePhotos ?? getCachedSearch(eventId)?.photos ?? null
  );
  // The event page hands its already-fetched event data over via router state (same
  // as `photos` above) so this page doesn't need to re-hit /api/eventos/{id}. Entry
  // points without it (direct URL visits, the header's favorites icon) fall back to
  // eventInfoCache.ts first, then to fetching it here.
  const passedEvent = routerState?.event && routerState.event.id === eventId ? routerState.event : null;
  const [fetchedInfo, setFetchedInfo] = useState<EventHeaderInfo | null>(
    () => getCachedEventInfo(eventId) ?? null
  );
  const headerInfo = passedEvent ?? fetchedInfo;
  const [sessionExpired, setSessionExpired] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    // The event name is shown in a card in the page body instead of the app
    // header here — see EventoPage.tsx for the same treatment.
    setEventTitle(null);
  }, [eventId, setEventTitle]);

  useEffect(() => {
    if (passedEvent) {
      setCachedEventInfo(passedEvent);
      return;
    }
    const cached = getCachedEventInfo(eventId);
    if (cached) {
      setFetchedInfo(cached);
      return;
    }
    let cancelled = false;
    fetchEventInfo(eventId)
      .then((info) => {
        if (cancelled) return;
        const event = { id: eventId, ...info };
        setFetchedInfo(event);
        setCachedEventInfo(event);
      })
      .catch((err) => console.error('[FavoritesPage] falha ao buscar dados do evento', err));
    return () => {
      cancelled = true;
    };
  }, [eventId, passedEvent]);

  useEffect(() => {
    if (allPhotos !== null) return;
    let cancelled = false;
    fetchEventPhotos(eventId)
      .then((result) => {
        if (cancelled) return;
        setAllPhotos(result.photos);
        setCachedSearch(eventId, { photos: result.photos, hasSearched: true, error: null });
        if (result.photos.length === 0 && favorites.size > 0) {
          setSessionExpired(true);
        }
      })
      .catch((err) => {
        console.error('[FavoritesPage] falha ao buscar fotos do evento', err);
        if (!cancelled) setSessionExpired(true);
      });
    return () => {
      cancelled = true;
    };
    // Only re-runs if we never got photos from navigation state — favorites/eventId
    // intentionally excluded so toggling favorites here doesn't retrigger a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPhotos, eventId]);

  const favoritePhotos = (allPhotos ?? []).filter((p) => favorites.has(p.id));
  const { pricePerPhoto, packagePrice } = getMockEventMeta(eventId);
  const subtotal = favoritePhotos.length * pricePerPhoto;
  const totalPhotosCount = allPhotos?.length ?? 0;
  const packageTotal = totalPhotosCount * packagePrice;
  const showUpsell = favoritePhotos.length > 0 && favoritePhotos.length < totalPhotosCount;
  // Favoriting every photo in the event qualifies for the package rate — same
  // discount the upsell banner above the grid entices toward.
  const isFullPackage = totalPhotosCount > 0 && favoritePhotos.length === totalPhotosCount;
  const finalTotal = isFullPackage ? packageTotal : subtotal;

  const locationLabel = headerInfo ? formatLocationLabel(headerInfo.city, headerInfo.state) : null;
  const dateLabel = headerInfo ? formatDateLabel(headerInfo.date) : null;
  const categoryLabel = headerInfo?.categoryId ? getCategoriaLabel(categorias, headerInfo.categoryId) : null;

  function handleRemove(photoId: string) {
    toggleFavorite(photoId);
  }

  function addAllFavorites() {
    (allPhotos ?? []).forEach((photo) => {
      if (!isFavorite(photo.id)) toggleFavorite(photo.id);
    });
  }

  function goToCheckout() {
    navigate(`/evento/${eventId}/checkout`, {
      state: { photos: favoritePhotos, total: finalTotal, eventName: headerInfo?.name ?? null },
    });
  }

  return (
    <div className={`favorites-page${favoritePhotos.length > 0 ? ' favorites-page--with-footer' : ''}`}>
      {headerInfo?.name && (
        <div className="evento-hero photip-card">
          {categoryLabel && <span className="photip-badge">{categoryLabel}</span>}
          <h1 className="evento-hero__title">{headerInfo.name}</h1>
          {(locationLabel || dateLabel || headerInfo.photosCount != null) && (
            <div className="evento-hero__meta">
              {dateLabel && (
                <span>
                  <CalendarIcon className="evento-hero__meta-icon" /> {dateLabel}
                </span>
              )}
              {headerInfo.photosCount != null && (
                <span>
                  <CameraIcon className="evento-hero__meta-icon" /> {formatPhotosCount(headerInfo.photosCount)} fotos
                </span>
              )}
              {locationLabel && (
                <span>
                  <PinIcon className="evento-hero__meta-icon" /> {locationLabel}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <h2 className="favorites-page__title">Minhas Favoritas</h2>

      {sessionExpired && favoritePhotos.length === 0 && (
        <div className="favorites-page__empty">
          <p>Sua sessão de busca expirou. Busque suas fotos novamente para ver suas favoritas.</p>
          <button
            type="button"
            className="photip-btn photip-btn--primary"
            onClick={() => navigate(`/evento/${eventId}`)}
          >
            Buscar minhas fotos
          </button>
        </div>
      )}

      {!sessionExpired && favoritePhotos.length === 0 && (
        <div className="favorites-page__empty">
          <p>Você ainda não tem fotos favoritas neste evento.</p>
          <button
            type="button"
            className="photip-btn photip-btn--primary"
            onClick={() => navigate(`/evento/${eventId}`)}
          >
            Ver fotos do evento
          </button>
        </div>
      )}

      {favoritePhotos.length > 0 && (
        <>
          {showUpsell && (
            <UpsellBanner
              photosCount={totalPhotosCount}
              pricePerPhoto={pricePerPhoto}
              packagePrice={packagePrice}
              onAddAllFavorites={addAllFavorites}
            />
          )}

          <div className="photo-grid favorites-page__grid">
            {favoritePhotos.map((photo, index) => (
              <div key={photo.id} className="photo-grid__item">
                <button
                  type="button"
                  className="photo-grid__open"
                  onClick={() => setViewerIndex(index)}
                >
                  <img src={photo.thumbs.m} alt="" loading="lazy" />
                </button>
                <button
                  type="button"
                  className="photo-grid__fav-btn photo-grid__fav-btn--remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(photo.id);
                  }}
                  aria-label="Remover dos favoritos"
                >
                  <X size={14} strokeWidth={3.5} stroke="var(--photip-danger)" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <PurchaseFooter
            count={favoritePhotos.length}
            total={finalTotal}
            originalTotal={isFullPackage ? subtotal : undefined}
            ctaLabel="Comprar agora"
            onCta={goToCheckout}
          />
        </>
      )}

      {viewerIndex !== null && (
        <PhotoViewer
          photos={favoritePhotos}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          favoritesCount={favoritePhotos.length}
          aiEnabled={aiPhotoEditEnabled}
        />
      )}
    </div>
  );
}
