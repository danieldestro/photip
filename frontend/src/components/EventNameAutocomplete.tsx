import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { searchEventosPorNome } from '../api/client';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { EventHeaderInfo, EventNameSuggestion } from '../types';

const MIN_QUERY_LENGTH = 3;

interface EventNameAutocompleteProps {
  estado?: string;
}

export function EventNameAutocomplete({ estado }: EventNameAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<EventNameSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const debouncedQuery = useDebouncedValue(query.trim(), 350);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    searchEventosPorNome({ nome: debouncedQuery, estado })
      .then((res) => {
        if (cancelled) return;
        setSuggestions(res.events);
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, estado]);

  function handleSelect(event: EventNameSuggestion) {
    setOpen(false);
    setQuery('');
    setSuggestions([]);
    const headerInfo: EventHeaderInfo = {
      id: event.id,
      name: event.name,
      city: null,
      state: null,
      location: event.location,
      date: event.date,
      photosCount: null,
      categoryId: null,
      // Placeholder — EventoPage always re-fetches the authoritative value on
      // mount and never trusts this passed-state object for that decision.
      proprio: false,
      providerSlug: null,
    };
    navigate(`/evento/${event.id}`, { state: { event: headerInfo } });
  }

  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div className="home-hero__search">
      <input
        type="text"
        placeholder="Buscar evento pelo nome"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      <button type="button" aria-label="Buscar" tabIndex={-1}>
        <Search size={19} strokeWidth={2.4} aria-hidden="true" />
      </button>

      {showDropdown && (
        <div className="home-autocomplete">
          {loading ? (
            <div className="home-autocomplete__hint">Buscando…</div>
          ) : suggestions.length === 0 ? (
            <div className="home-autocomplete__hint">Nenhum evento encontrado.</div>
          ) : (
            suggestions.map((event) => (
              <button
                key={event.id}
                type="button"
                className="home-autocomplete__item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(event)}
              >
                <span className="home-autocomplete__item-name">{event.name}</span>
                <span className="home-autocomplete__item-meta">
                  {event.location}
                  {event.date ? ` · ${event.date}` : ''}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
