import { Heart } from 'lucide-react';
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
              <Heart
                size={16}
                strokeWidth={2.6}
                stroke="#fff"
                fill={isFavorite?.(photo.id) ? 'var(--photip-yellow-accent)' : 'transparent'}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
