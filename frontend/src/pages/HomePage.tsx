import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ESTADOS } from '../data/estados';
import { CategoryPills } from '../components/CategoryPills';
import { FilterSelects } from '../components/FilterSelects';
import { EventSummaryCard } from '../components/EventSummaryCard';
import { EventNameAutocomplete } from '../components/EventNameAutocomplete';
import { ViewToggle, type EventsViewMode } from '../components/ViewToggle';
import { useEventosBusca, toApiFilter } from '../hooks/useEventosBusca';
import { useCategorias } from '../hooks/useCategorias';
import { useProvedores } from '../hooks/useProvedores';
import { getUserPreferences, setUserPreferredCategoria, setUserPreferredEstado } from '../lib/userPreferences';

const STATE_FILTER_OPTIONS = ESTADOS.map((e) => ({ id: e.id, label: e.descricao }));

export function HomePage() {
  // Priority for both filters' initial value: user_preferences in localStorage, else the
  // app default (seeded into localStorage the first time via getUserPreferences itself).
  const [categoryFilter, setCategoryFilter] = useState(() => getUserPreferences().categoria);
  const [stateFilter, setStateFilter] = useState(() => getUserPreferences().estado);
  const [providerFilter, setProviderFilter] = useState('all');
  const [viewMode, setViewMode] = useState<EventsViewMode>('compact');
  const navigate = useNavigate();
  const { categorias } = useCategorias();
  // Ordem do carrossel (CategoryPills) vem da API (Categoria.ordem, ver backend/src/routes/categorias.ts);
  // o <select> de filtro (FilterSelects) sempre lista em ordem alfabética, independente disso.
  const categoryOptions = categorias.map((c) => ({ id: String(c.id), label: c.nome, icone: c.icone }));
  const categoryOptionsAlpha = [...categoryOptions].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  const { provedores } = useProvedores();
  const providerOptions = provedores.map((p) => ({ id: String(p.id), label: p.nome }));

  const {
    events: recentEvents,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
  } = useEventosBusca({
    estado: toApiFilter(stateFilter),
    cat: toApiFilter(categoryFilter),
    provedor: toApiFilter(providerFilter),
  });

  function handleStateFilterChange(value: string) {
    setStateFilter(value);
    setUserPreferredEstado(value);
  }

  function handleCategoryFilterChange(value: string) {
    setCategoryFilter(value);
    setUserPreferredCategoria(value);
  }

  function handleProviderFilterChange(value: string) {
    setProviderFilter(value);
  }

  function goExplore(categoryId?: string) {
    const params = new URLSearchParams();
    const category = categoryId ?? (categoryFilter !== 'all' ? categoryFilter : undefined);
    if (category) params.set('categoria', category);
    if (stateFilter !== 'all') params.set('estado', stateFilter);
    const query = params.toString();
    navigate(query ? `/eventos?${query}` : '/eventos');
  }

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-hero__inner">
          <h1>Encontre seus melhores momentos</h1>
          <EventNameAutocomplete estado={toApiFilter(stateFilter)} />
          <p className="home-hero__hint">
            <a href="#" onClick={(e) => { e.preventDefault(); goExplore(); }}>Clique aqui</a>
            {' '}para encontrar outros eventos
          </p>
        </div>
      </div>

      <div className="home-content">
        <div className="category-pills-wrap photip-card">
          <CategoryPills categories={categoryOptions} onSelect={(id) => goExplore(id)} />
        </div>

        <div className="home-section-header">
          <div className="home-section-header__title">
            <h2>Eventos Recentes</h2>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>
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
        </div>

        {loading ? (
          <div className="home-recent-loading">Carregando eventos…</div>
        ) : error && recentEvents.length === 0 ? (
          <div className="home-recent-error">{error}</div>
        ) : (
          <div className={`event-grid${viewMode === 'compact' ? ' event-grid--compact' : ''}`}>
            {recentEvents.map((event) => (
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
    </div>
  );
}
