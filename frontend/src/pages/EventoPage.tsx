import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { fetchEventInfo, fetchEventPhotos, sendSelfie } from '../api/client';
import { useFavorites } from '../hooks/useFavorites';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCategorias } from '../hooks/useCategorias';
import { getCategoriaLabel } from '../lib/categorias';
import { getMockEventMeta } from '../data/exploreCatalog';
import { setLastEventId } from '../lib/lastEvent';
import { getCachedSearch, setCachedSearch } from '../lib/photoSearchCache';
import { getCachedEventInfo, setCachedEventInfo } from '../lib/eventInfoCache';
import { formatDateLabel, formatLocationLabel, formatPhotosCount } from '../lib/eventDisplay';
import { ProviderBadge } from '../components/ProviderBadge';
import { SelfieUpload } from '../components/SelfieUpload';
import { PhotoGrid } from '../components/PhotoGrid';
import { PhotoViewer } from '../components/PhotoViewer';
import { UpsellBanner } from '../components/UpsellBanner';
import { PurchaseFooter } from '../components/PurchaseFooter';
import { CalendarIcon, CameraIcon, PinIcon } from '../components/icons';
import type { HeaderContext } from '../layouts/headerContext';
import type { EventHeaderInfo, Photo } from '../types';

type Status = 'idle' | 'loading' | 'results' | 'empty';

export function EventoPage() {
  const { eventId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { setEventTitle } = useOutletContext<HeaderContext>();
  // A click from Home/Eventos hands the event data over via router state, used below
  // only to paint the header card instantly. The authoritative data — in particular
  // `proprio`, which decides selfie-search vs. gallery mode — always comes from
  // `fetchedInfo` (cache or a fresh GET /api/eventos/:id, now a fast local DB read,
  // not a scrape) since the passed-state object can't be trusted to know that (e.g.
  // a click from the name autocomplete never has it).
  const passedEvent = (location.state as { event?: EventHeaderInfo } | null)?.event ?? null;
  const [fetchedInfo, setFetchedInfo] = useState<EventHeaderInfo | null>(
    () => getCachedEventInfo(eventId) ?? null
  );
  const headerInfo = passedEvent && passedEvent.id === eventId ? passedEvent : fetchedInfo;
  const [photos, setPhotos] = useState<Photo[]>(() => getCachedSearch(eventId)?.photos ?? []);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(() => getCachedSearch(eventId)?.hasSearched ?? false);
  const [error, setError] = useState<string | null>(() => getCachedSearch(eventId)?.error ?? null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { isFavorite, toggleFavorite, favorites } = useFavorites(eventId);
  const { aiPhotoEditEnabled } = useAppConfig();
  const { categorias } = useCategorias();

  useEffect(() => {
    setLastEventId(eventId);
  }, [eventId]);

  // Keeps the search results alive across Evento ↔ Favoritas navigation (see
  // photoSearchCache.ts) — restored above via the states' lazy initializers.
  useEffect(() => {
    setCachedSearch(eventId, { photos, hasSearched, error });
  }, [eventId, photos, hasSearched, error]);

  useEffect(() => {
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
      .catch((err) => console.error('[EventoPage] falha ao buscar dados do evento', err));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    document.title = headerInfo?.name ? `${headerInfo.name} · photip` : 'photip';
  }, [headerInfo?.name]);

  useEffect(() => {
    // The event name is shown in a card in the page body instead of the app
    // header here — clear it so a name left over from a previous event page
    // doesn't flash in the header on mount.
    setEventTitle(null);
  }, [eventId, setEventTitle]);

  // Provedor próprio: no selfie search — the gallery loads on its own as soon as
  // we know `proprio` is true (only from the authoritative fetch, see above).
  useEffect(() => {
    if (fetchedInfo?.proprio !== true || hasSearched) return;
    setLoading(true);
    setError(null);
    fetchEventPhotos(eventId)
      .then((result) => {
        setPhotos(result.photos);
        if (result.photos.length === 0) {
          setError(result.message ?? 'Nenhuma foto cadastrada para este evento ainda.');
        }
      })
      .catch((err) => {
        console.error('[EventoPage] falha ao carregar galeria do evento', err);
        setError('Não foi possível carregar as fotos agora. Tente novamente.');
      })
      .finally(() => {
        setLoading(false);
        setHasSearched(true);
      });
  }, [fetchedInfo?.proprio, eventId, hasSearched]);

  async function handleSearch(file: File) {
    setLoading(true);
    setError(null);
    setPhotos([]);
    try {
      await sendSelfie(eventId, file);
      const result = await fetchEventPhotos(eventId);
      setPhotos(result.photos);
      if (result.photos.length === 0) {
        setError(result.message ?? 'Nenhuma foto encontrada com essa selfie neste evento.');
      }
    } catch (err) {
      console.error('[EventoPage] busca de fotos falhou', err);
      const message = err instanceof Error ? err.message : undefined;
      setError(message ?? 'Não foi possível buscar suas fotos agora. Tente novamente.');
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }

  function addAllFavorites() {
    photos.forEach((photo) => {
      if (!isFavorite(photo.id)) toggleFavorite(photo.id);
    });
  }

  function startNewSearch() {
    setPhotos([]);
    setHasSearched(false);
    setError(null);
    setViewerIndex(null);
  }

  const proprio = fetchedInfo?.proprio;
  const status: Status = loading
    ? 'loading'
    : photos.length > 0
      ? 'results'
      : hasSearched
        ? 'empty'
        : 'idle';

  const favCount = photos.filter((p) => favorites.has(p.id)).length;
  const { pricePerPhoto, packagePrice } = getMockEventMeta(eventId);
  const favTotal = favCount * pricePerPhoto;

  const locationLabel = headerInfo ? formatLocationLabel(headerInfo.city, headerInfo.state) : null;
  const dateLabel = headerInfo ? formatDateLabel(headerInfo.date) : null;
  const categoryLabel = headerInfo?.categoryId ? getCategoriaLabel(categorias, headerInfo.categoryId) : null;

  return (
    <div className={`evento-page${status === 'results' ? ' evento-page--with-footer' : ''}`}>
      {headerInfo?.name && (
        <div className="evento-hero photip-card">
          {(categoryLabel || headerInfo.providerSlug) && (
            <div className="evento-hero__badges">
              {categoryLabel && <span className="photip-badge">{categoryLabel}</span>}
              {headerInfo.providerSlug && <ProviderBadge slug={headerInfo.providerSlug} />}
            </div>
          )}
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

      {status === 'empty' && error && (
        <div className="evento-alert" role="alert">
          <span className="evento-alert__icon" aria-hidden="true">
            ⚠️
          </span>
          <p className="evento-alert__text">{error}</p>
        </div>
      )}

      {proprio === false && (status === 'idle' || status === 'empty') && (
        <div>
          <SelfieUpload onSearch={handleSearch} loading={loading} />
        </div>
      )}

      {status === 'loading' && (
        <div className="evento-loading photip-card">
          <div className="evento-loading__spinner" />
          <p>{proprio ? 'Carregando fotos do evento…' : 'Buscando suas fotos com reconhecimento facial…'}</p>
        </div>
      )}

      {status === 'results' && (
        <div className="evento-hero__results-header">
          <h2 className="favorites-page__title">Fotos do Evento</h2>
          {proprio === false && (
            <button type="button" className="evento-hero__new-search" onClick={startNewSearch}>
              Nova busca
            </button>
          )}
        </div>
      )}
      {status === 'results' && <p className="evento-hero__results">{photos.length} fotos encontradas</p>}

      {status === 'results' && (
        <div>
          <UpsellBanner
            photosCount={photos.length}
            pricePerPhoto={pricePerPhoto}
            packagePrice={packagePrice}
            onAddAllFavorites={addAllFavorites}
          />
          <PhotoGrid
            photos={photos}
            onSelect={setViewerIndex}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        </div>
      )}

      {status === 'results' && (
        <PurchaseFooter
          count={favCount}
          total={favTotal}
          ctaLabel="Ver Favoritas"
          onCta={() =>
            // Hands the event data and search results we already have over to the
            // Favoritas page so it doesn't need to re-fetch them — see FavoritesPage.tsx.
            navigate(`/evento/${eventId}/favoritas`, { state: { photos, event: headerInfo } })
          }
        />
      )}

      {viewerIndex !== null && (
        <PhotoViewer
          photos={photos}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          favoritesCount={favCount}
          variant="drawer"
          aiEnabled={aiPhotoEditEnabled}
        />
      )}
    </div>
  );
}
