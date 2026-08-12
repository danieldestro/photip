import { Navigate } from 'react-router-dom';
import { getLastEventId } from '../lib/lastEvent';

// Entry point for links that don't know a specific event (e.g. the footer's
// "Favoritas" link) — favorites are always scoped to an event, so this just
// forwards to the last one the user viewed, same source NavDrawer uses.
export function FavoritasRedirect() {
  const eventId = getLastEventId();
  return <Navigate to={eventId ? `/evento/${eventId}/favoritas` : '/eventos'} replace />;
}
