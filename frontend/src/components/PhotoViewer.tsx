import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, Heart, Sparkles, X } from 'lucide-react';
import type { Photo } from '../types';
import { AiEffectSheet } from './AiEffectSheet';

function ThumbStrip({
  photos,
  index,
  onIndexChange,
}: {
  photos: Photo[];
  index: number;
  onIndexChange: (index: number) => void;
}) {
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    thumbRefs.current[index]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'start',
      block: 'nearest',
    });
  }, [index]);

  return (
    <div
      className="photo-viewer__thumbstrip"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {photos.map((thumbPhoto, i) => (
        <button
          key={thumbPhoto.id}
          type="button"
          ref={(el) => {
            thumbRefs.current[i] = el;
          }}
          className={`photo-viewer__thumb${i === index ? ' is-active' : ''}`}
          onClick={() => onIndexChange(i)}
          aria-label={`Ver foto ${i + 1}`}
          aria-current={i === index}
        >
          <img src={thumbPhoto.thumbs.p} alt="" loading="lazy" />
        </button>
      ))}
    </div>
  );
}

interface PhotoViewerProps {
  photos: Photo[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  isFavorite: (photoId: string) => boolean;
  onToggleFavorite: (photoId: string) => void;
  favoritesCount: number;
  variant?: 'modal' | 'drawer';
  aiEnabled?: boolean;
}

const SWIPE_THRESHOLD_PX = 50;

export function PhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
  isFavorite,
  onToggleFavorite,
  favoritesCount,
  variant = 'modal',
  aiEnabled = false,
}: PhotoViewerProps) {
  const touchStartX = useRef<number | null>(null);
  const photo = photos[index];
  const [showAiSheet, setShowAiSheet] = useState(false);

  const goPrev = () => onIndexChange((index - 1 + photos.length) % photos.length);
  const goNext = () => onIndexChange((index + 1) % photos.length);

  // The AI sheet is per-photo — don't let it stay open (mid-effect or showing a
  // result) when the user swipes/navs to a different photo in the viewer.
  useEffect(() => {
    setShowAiSheet(false);
  }, [index]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  useEffect(() => {
    const next = photos[(index + 1) % photos.length];
    const prev = photos[(index - 1 + photos.length) % photos.length];
    [next, prev].filter(Boolean).forEach((neighbour) => {
      const preload = new Image();
      preload.src = neighbour.thumbs.g;
    });
  }, [index, photos]);

  function handleTouchStart(event: TouchEvent) {
    touchStartX.current = event.touches[0].clientX;
  }

  function handleTouchEnd(event: TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX) {
      if (deltaX > 0) goPrev();
      else goNext();
    }
    touchStartX.current = null;
  }

  if (!photo) return null;

  return (
    <div
      className={`photo-viewer${variant === 'drawer' ? ' photo-viewer--drawer' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="photo-viewer__panel">
        <div className="photo-viewer__top">
          <div className="photo-viewer__fav-count" aria-label={`${favoritesCount} fotos favoritas`}>
            <Heart size={14} strokeWidth={2.4} fill="currentColor" aria-hidden="true" /> {favoritesCount}
          </div>

          <div className="photo-viewer__counter">
            {index + 1} de {photos.length}
          </div>
        </div>

        <button type="button" className="photo-viewer__close" onClick={onClose} aria-label="Fechar">
          <X size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="photo-viewer__nav photo-viewer__nav--prev"
          onClick={goPrev}
          aria-label="Foto anterior"
        >
          <ChevronLeft size={22} strokeWidth={2.4} aria-hidden="true" />
        </button>

        <div className="photo-viewer__frame">
          <img className="photo-viewer__image" src={photo.thumbs.g} alt="" />

          <button
            type="button"
            className={`photo-viewer__favorite${isFavorite(photo.id) ? ' is-active' : ''}`}
            onClick={() => onToggleFavorite(photo.id)}
            aria-label="Favoritar"
          >
            <Heart size={20} strokeWidth={2.2} fill={isFavorite(photo.id) ? 'currentColor' : 'transparent'} aria-hidden="true" />
          </button>

          {aiEnabled && (
            <button
              type="button"
              className="photo-viewer__ai-action"
              onClick={() => setShowAiSheet(true)}
              aria-label="Gerar efeito com IA"
            >
              <Sparkles size={14} strokeWidth={2.2} aria-hidden="true" /> IA
            </button>
          )}
        </div>

        <button
          type="button"
          className="photo-viewer__nav photo-viewer__nav--next"
          onClick={goNext}
          aria-label="Próxima foto"
        >
          <ChevronRight size={22} strokeWidth={2.4} aria-hidden="true" />
        </button>

        <div className="photo-viewer__footer">
          <ThumbStrip photos={photos} index={index} onIndexChange={onIndexChange} />
        </div>
      </div>

      {showAiSheet && <AiEffectSheet photo={photo} onClose={() => setShowAiSheet(false)} />}
    </div>
  );
}
