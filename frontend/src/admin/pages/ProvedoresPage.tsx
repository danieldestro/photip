import { useState } from 'react';
import { provedoresApi, syncProvedor } from '../api';
import { EntityCrudPage } from '../components/EntityCrudPage';
import type { EntityColumn } from '../components/EntityTable';
import type { EntityField } from '../components/EntityForm';
import { formatDateTimeBR } from '../formatters';
import { SyncFullIcon, SyncIcon } from '../icons';
import type { Provedor } from '../types';

const COLUMNS: EntityColumn<Provedor>[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'slug', label: 'Slug' },
  { key: 'descricao', label: 'Descrição', render: (p) => p.descricao ?? '—' },
  { key: 'urlSite', label: 'URL', render: (p) => p.urlSite ?? '—' },
  { key: 'proprio', label: 'Próprio', render: (p) => (p.proprio ? 'Sim' : 'Não') },
  {
    key: 'ultimaSincronizacao',
    label: 'Última sincronização',
    render: (p) => {
      if (!p.ultimaSincronizacaoEm) return '—';
      const isError = p.ultimaSincronizacaoResultado?.startsWith('Erro');
      return (
        <span title={p.ultimaSincronizacaoResultado ?? ''}>
          {isError ? '⚠️ ' : ''}
          {formatDateTimeBR(p.ultimaSincronizacaoEm)}
        </span>
      );
    },
  },
];

const FIELDS: EntityField[] = [
  { key: 'nome', label: 'Nome', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text', required: true },
  { key: 'descricao', label: 'Descrição', type: 'textarea' },
  { key: 'urlSite', label: 'URL do site', type: 'text' },
  { key: 'proprio', label: 'Provedor próprio', type: 'boolean' },
  { key: 'ativo', label: 'Ativo', type: 'boolean' },
  { key: 'syncMaxPaginas', label: 'Máx. páginas por sincronização', type: 'number', placeholder: 'default do provedor' },
  {
    key: 'syncJanelaIncrementalDias',
    label: 'Janela incremental (dias) — não usado pelo Fotto',
    type: 'number',
    placeholder: 'default global (Configurações)',
  },
  {
    key: 'syncJanelaCompletaDias',
    label: 'Janela do sync completo (dias) — não usado pelo Fotto',
    type: 'number',
    placeholder: 'default do provedor',
  },
];

function SincronizarButton({ provedor, reload }: { provedor: Provedor; reload: () => void }) {
  const [syncing, setSyncing] = useState<'full' | 'incremental' | null>(null);

  async function handleClick(full: boolean) {
    setSyncing(full ? 'full' : 'incremental');
    try {
      const result = await syncProvedor(provedor.id, full);
      alert(`Sincronizado: ${result.created} criados, ${result.updated} atualizados, ${result.skipped} pulados.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao sincronizar.');
    } finally {
      setSyncing(null);
      reload();
    }
  }

  return (
    <span className="admin-row-actions">
      <button
        type="button"
        className={`admin-btn admin-btn--ghost admin-btn--icon${syncing === 'incremental' ? ' is-syncing' : ''}`}
        onClick={() => handleClick(false)}
        disabled={syncing !== null}
        title={syncing === 'incremental' ? 'Sincronizando…' : 'Sincronizar'}
        aria-label={syncing === 'incremental' ? 'Sincronizando…' : 'Sincronizar'}
      >
        <SyncIcon />
      </button>
      <button
        type="button"
        className={`admin-btn admin-btn--ghost admin-btn--icon${syncing === 'full' ? ' is-syncing' : ''}`}
        onClick={() => handleClick(true)}
        disabled={syncing !== null}
        title={syncing === 'full' ? 'Sincronizando…' : 'Sincronizar completo'}
        aria-label={syncing === 'full' ? 'Sincronizando…' : 'Sincronizar completo'}
      >
        <SyncFullIcon />
      </button>
    </span>
  );
}

export function ProvedoresPage() {
  return (
    <EntityCrudPage
      title="Provedores"
      api={provedoresApi}
      columns={COLUMNS}
      fields={FIELDS}
      defaultCreateValues={{ ativo: true, proprio: false }}
      renderRowExtra={(provedor, reload) => <SincronizarButton provedor={provedor} reload={reload} />}
    />
  );
}
