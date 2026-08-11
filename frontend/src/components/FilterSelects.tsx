interface FilterOption {
  id: string;
  label: string;
}

interface FilterSelectsProps {
  categories: FilterOption[];
  states: FilterOption[];
  providers: FilterOption[];
  categoryFilter: string;
  stateFilter: string;
  providerFilter: string;
  onCategoryChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onProviderChange: (value: string) => void;
}

export function FilterSelects({
  categories,
  states,
  providers,
  categoryFilter,
  stateFilter,
  providerFilter,
  onCategoryChange,
  onStateChange,
  onProviderChange,
}: FilterSelectsProps) {
  return (
    <div className="filter-selects">
      <select
        className="photip-pill-select"
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
      >
        <option value="all">Todas Categorias</option>
        {categories.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        className="photip-pill-select"
        value={stateFilter}
        onChange={(e) => onStateChange(e.target.value)}
      >
        <option value="all">Todos Estados</option>
        {states.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.id}
          </option>
        ))}
      </select>
      <select
        className="photip-pill-select"
        value={providerFilter}
        onChange={(e) => onProviderChange(e.target.value)}
      >
        <option value="all">Todos Provedores</option>
        {providers.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
