import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EventSummary } from '../types';
import { useCategorias } from '../hooks/useCategorias';
import { getCategoriaLabel } from '../lib/categorias';
import { formatDateLabel } from '../lib/eventDisplay';
import { ProviderBadge } from './ProviderBadge';
import { CalendarIcon, PinIcon } from './icons';

interface EventSummaryCardProps {
  event: EventSummary;
  // Overrides the default `/evento/:id` target — e.g. AllFavoritesPage links
  // straight into that event's favoritas instead of its photo search.
  to?: string;
  // Extra badge rendered alongside the category/provider ones — e.g. a
  // favorited-photos count.
  extraBadge?: ReactNode;
}

export function EventSummaryCard({ event, to, extraBadge }: EventSummaryCardProps) {
  const navigate = useNavigate();
  const { categorias } = useCategorias();
  const dateLabel = formatDateLabel(event.date);

  return (
    <div
      className="event-card photip-card"
      onClick={() => navigate(to ?? `/evento/${event.id}`, { state: { event } })}
    >
      <div className="event-card__cover event-card__cover--photo">
        {event.coverUrl && (
          <img
            src={event.coverUrl}
            alt={event.name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.visibility = 'hidden';
            }}
          />
        )}
      </div>
      <div className="event-card__body">
        <div className="event-card__badges">
          <span className="photip-badge">{getCategoriaLabel(categorias, event.categoryId)}</span>
          <ProviderBadge slug={event.providerSlug} />
          {extraBadge}
        </div>
        <h3 className="event-card__name">{event.name}</h3>
        <div className="event-card__meta">
          <span>
            {dateLabel && (
              <span>
                <CalendarIcon className="event-card__meta-icon" />{' '}
                {dateLabel}
              </span>
            )}
            {' '}
            <PinIcon className="event-card__meta-icon" />{' '}
            {event.city}
            {event.state ? `, ${event.state}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
