import type { ReactNode } from 'react';
import { formatNumberBR } from '../formatters';

export interface EntityColumn<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
}

interface EntityTableProps<T extends { id: number; ativo: boolean }> {
  title: string;
  columns: EntityColumn<T>[];
  items: T[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
  search: string;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onCreate: () => void;
  onEdit: (item: T) => void;
  onToggleAtivo: (item: T) => void;
  /** Extra per-row action(s) rendered after "Editar" (ex: "Sincronizar" nos Provedores). */
  renderRowExtra?: (item: T) => ReactNode;
  /** Filtros extras (selects) renderizados ao lado da busca (ex: Categoria/Provedor/UF nos Eventos). */
  filters?: ReactNode;
}

export function EntityTable<T extends { id: number; ativo: boolean }>({
  title,
  columns,
  items,
  loading,
  error,
  page,
  pageSize,
  total,
  search,
  onSearchChange,
  onPageChange,
  onCreate,
  onEdit,
  onToggleAtivo,
  renderRowExtra,
  filters,
}: EntityTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>{title}</h1>
        <button type="button" className="admin-btn admin-btn--primary" onClick={onCreate}>
          Novo
        </button>
      </div>

      <div className="admin-toolbar">
        <input
          type="search"
          className="admin-search"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {filters && <div className="admin-filters">{filters}</div>}
      </div>

      {error && <p className="admin-form__error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              <th>Ativo</th>
              <th>Ações</th>
              {renderRowExtra && <th />}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length + 2 + (renderRowExtra ? 1 : 0)}>Carregando…</td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2 + (renderRowExtra ? 1 : 0)}>Nenhum registro encontrado.</td>
              </tr>
            )}
            {!loading &&
              items.map((item) => (
                <tr key={item.id}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(item) : String((item as any)[col.key] ?? '—')}</td>
                  ))}
                  <td>
                    <button
                      type="button"
                      className={`admin-badge ${item.ativo ? 'admin-badge--on' : 'admin-badge--off'}`}
                      onClick={() => onToggleAtivo(item)}
                      title="Alternar ativo/inativo"
                    >
                      {item.ativo ? 'Sim' : 'Não'}
                    </button>
                  </td>
                  <td>
                    <button type="button" className="admin-btn admin-btn--ghost" onClick={() => onEdit(item)}>
                      Editar
                    </button>
                  </td>
                  {renderRowExtra && <td>{renderRowExtra(item)}</td>}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <button type="button" className="admin-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </button>
        <span>
          Página {formatNumberBR(page)} de {formatNumberBR(totalPages)} ({formatNumberBR(total)}{' '}
          {total === 1 ? 'registro' : 'registros'})
        </span>
        <button
          type="button"
          className="admin-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
