import type { Photo } from '../types';

interface PhotoGridProps {
  photos: Photo[];
  onSelect: (index: number) => void;
  isFavorite?: (photoId: string) => boolean;
  onToggleFavorite?: (photoId: string) => void;
}

export function PhotoGrid({ photos, onSelect, isFavorite, onToggleFavorite }: PhotoGridProps) {
  return (
    <div className="photo-grid">
      {photos.map((photo, index) => (
        <div key={photo.id} className="photo-grid__item">
          <button type="button" className="photo-grid__open" onClick={() => onSelect(index)}>
            <img src={photo.thumbs.m} alt="" loading="lazy" />
          </button>
          {onToggleFavorite && (
            <button
              type="button"
              className="photo-grid__fav-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(photo.id);
              }}
              aria-label="Favoritar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  d="M12 21.3s-7.6-4.35-10.15-9.02C-.15 8.4 1.6 4.1 5.85 4.1c2.4 0 4.05 1.4 6.15 3.75 2.1-2.35 3.75-3.75 6.15-3.75 4.25 0 6 4.3 3.95 8.18C19.6 16.95 12 21.3 12 21.3Z"
                  fill={isFavorite?.(photo.id) ? 'var(--photip-yellow-accent)' : 'rgba(0,0,0,0)'}
                  stroke="#fff"
                  strokeWidth="2.6"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
