import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CategoryPillItem {
  id: string;
  label: string;
  icone?: string | null;
}

interface CategoryPillsProps {
  categories: CategoryPillItem[];
  onSelect: (categoryId: string) => void;
  size?: 'default' | 'small';
}

// How much of the visible track to advance per arrow click.
const SCROLL_STEP_RATIO = 0.8;

// Ids até este valor vêm da taxonomia original do Fotop e têm glifo na fonte fi-estacao (ver
// frontend/src/styles/fi-estacao.css); acima disso são categorias novas trazidas por outros
// provedores (ex: Foco Radical), sem glifo nessa fonte — usam cat.icone (SVG próprio) quando
// disponível. Sem esse corte, ids novos que colidem por acaso com um glifo não-relacionado
// sobrando da fonte (ex: id 91) renderizariam um ícone errado em vez de nenhum.
const FOTOP_ICON_FONT_MAX_ID = 80;

export function CategoryPills({ categories, onSelect, size = 'default' }: CategoryPillsProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [categories]);

  function scrollByDirection(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * SCROLL_STEP_RATIO, behavior: 'smooth' });
  }

  return (
    <div className={`category-pills-carousel${size === 'small' ? ' category-pills-carousel--small' : ''}`}>
      <button
        type="button"
        className="category-pills-nav category-pills-nav--prev"
        onClick={() => scrollByDirection(-1)}
        aria-label="Categorias anteriores"
        disabled={!canScrollLeft}
      >
        <ChevronLeft size={16} strokeWidth={2.4} aria-hidden="true" />
      </button>

      <div
        className={`category-pills${size === 'small' ? ' category-pills--small' : ''}`}
        ref={trackRef}
        onScroll={updateScrollState}
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className="category-pill"
            onClick={() => onSelect(cat.id)}
          >
            <span className="category-pill__circle">
              {cat.icone ? (
                <img className="category-pill__icon" src={cat.icone} alt="" aria-hidden="true" />
              ) : Number(cat.id) <= FOTOP_ICON_FONT_MAX_ID ? (
                <i className={`fi-estacao-${cat.id}`} aria-hidden="true" />
              ) : null}
            </span>
            <span className="category-pill__label">{cat.label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="category-pills-nav category-pills-nav--next"
        onClick={() => scrollByDirection(1)}
        aria-label="Próximas categorias"
        disabled={!canScrollRight}
      >
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}
