import { LayoutGrid, Rows3 } from 'lucide-react';

export type EventsViewMode = 'list' | 'compact';

interface ViewToggleProps {
  value: EventsViewMode;
  onChange: (mode: EventsViewMode) => void;
}

// Only meant to be shown on mobile — see `.home-view-toggle` in home.css, which stays
// hidden above the mobile breakpoint since the grid already fits several columns there.
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="home-view-toggle" role="group" aria-label="Modo de exibição dos eventos">
      <button
        type="button"
        className={`home-view-toggle__btn${value === 'list' ? ' home-view-toggle__btn--active' : ''}`}
        onClick={() => onChange('list')}
        aria-pressed={value === 'list'}
        aria-label="Lista contínua"
        title="Lista contínua"
      >
        <Rows3 size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`home-view-toggle__btn${value === 'compact' ? ' home-view-toggle__btn--active' : ''}`}
        onClick={() => onChange('compact')}
        aria-pressed={value === 'compact'}
        aria-label="Duas colunas"
        title="Duas colunas"
      >
        <LayoutGrid size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
