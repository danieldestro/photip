import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ESTADOS } from '../data/estados';
import { CategoryPills } from '../components/CategoryPills';
import { FilterSelects } from '../components/FilterSelects';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { EventSummaryCard } from '../components/EventSummaryCard';
import { useEventosBusca, toApiFilter } from '../hooks/useEventosBusca';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useCategorias } from '../hooks/useCategorias';
import { useProvedores } from '../hooks/useProvedores';
import { getUserPreferences, setUserPreferredCategoria, setUserPreferredEstado } from '../lib/userPreferences';
import type { DateRange } from '../lib/dateRanges';

const STATE_FILTER_OPTIONS = ESTADOS.map((e) => ({ id: e.id, label: e.descricao }));

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categorias } = useCategorias();
  // Ordem do carrossel (CategoryPills) vem da API (Categoria.ordem, ver backend/src/routes/categorias.ts);
  // o <select> de filtro (FilterSelects) sempre lista em ordem alfabética, independente disso.
  const categoryOptions = categorias.map((c) => ({ id: String(c.id), label: c.nome, icone: c.icone }));
  const categoryOptionsAlpha = [...categoryOptions].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  const { provedores } = useProvedores();
  const providerOptions = provedores.map((p) => ({ id: String(p.id), label: p.nome }));
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('categoria') ?? 'all');
  const [providerFilter, setProviderFilter] = useState(searchParams.get('provedor') ?? 'all');
  // Same 3-tier mechanism as Home: search filter (this page's own state, seeded from the URL
  // if a link brought one along) → user_preferences in localStorage → app default.
  const [stateFilter, setStateFilter] = useState(
    () => searchParams.get('estado') ?? getUserPreferences().estado
  );
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const { events, loading, loadingMore, error, hasMore, loadMore } = useEventosBusca({
    estado: toApiFilter(stateFilter),
    cat: toApiFilter(categoryFilter),
    provedor: toApiFilter(providerFilter),
    nomeEvento: debouncedSearch.trim() || undefined,
    dataInicio: dateRange?.dataInicio,
    dataFim: dateRange?.dataFim,
  });

  function applyCategory(id: string) {
    setCategoryFilter(id);
    setUserPreferredCategoria(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('categoria', id);
      return next;
    });
  }

  function handleCategoryFilterChange(value: string) {
    setCategoryFilter(value);
    setUserPreferredCategoria(value);
  }

  function handleStateFilterChange(value: string) {
    setStateFilter(value);
    setUserPreferredEstado(value);
  }

  function handleProviderFilterChange(value: string) {
    setProviderFilter(value);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'all') {
        next.delete('provedor');
      } else {
        next.set('provedor', value);
      }
      return next;
    });
  }

  return (
    <div className="explore-page">
      <h1>Todos os eventos</h1>

      <CategoryPills categories={categoryOptions} onSelect={applyCategory} size="small" />

      <div className="explore-page__filters">
        <FilterSelects
          categories={categoryOptionsAlpha}
          states={STATE_FILTER_OPTIONS}
          providers={providerOptions}
          categoryFilter={categoryFilter}
          stateFilter={stateFilter}
          providerFilter={providerFilter}
          onCategoryChange={handleCategoryFilterChange}
          onStateChange={handleStateFilterChange}
          onProviderChange={handleProviderFilterChange}
        />
        <DateRangeFilter onChange={setDateRange} />
        <input
          type="text"
          className="explore-page__search-input"
          placeholder="Buscar por nome do evento..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="home-recent-loading">Carregando eventos…</div>
      ) : error && events.length === 0 ? (
        <div className="home-recent-error">{error}</div>
      ) : events.length === 0 ? (
        <div className="explore-page__empty">Nenhum evento encontrado com esses filtros.</div>
      ) : (
        <div className="event-grid">
          {events.map((event) => (
            <EventSummaryCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="home-more-cta">
          <button
            type="button"
            className="photip-btn photip-btn--primary"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Carregando…' : 'Carregar mais eventos'}
          </button>
        </div>
      )}
    </div>
  );
}
