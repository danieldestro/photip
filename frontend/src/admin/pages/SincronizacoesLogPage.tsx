import { useEffect, useState } from 'react';
import { fetchSincronizacoesLog, provedoresApi } from '../api';
import { formatDateTimeBR, formatDuration, formatNumberBR } from '../formatters';
import type { Provedor, SincronizacaoLog, StatusSincronizacao } from '../types';

const STATUS_LABELS: Record<StatusSincronizacao, string> = {
  em_andamento: 'Em andamento',
  sucesso: 'Sucesso',
  erro: 'Erro',
};

const PAGE_SIZE = 20;

export function SincronizacoesLogPage() {
  const [items, setItems] = useState<SincronizacaoLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [provedorOptions, setProvedorOptions] = useState<Provedor[]>([]);
  const [provedorFilter, setProvedorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    provedoresApi
      .list({ pageSize: 200 })
      .then((res) => setProvedorOptions(res.items))
      .catch((err) => console.error('[SincronizacoesLogPage] falha ao carregar provedores', err));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [provedorFilter, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSincronizacoesLog({
      page,
      pageSize: PAGE_SIZE,
      provedorId: provedorFilter || undefined,
      status: statusFilter || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Falha ao carregar histórico de sincronizações.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, provedorFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Sincronizações</h1>
      </div>

      <div className="admin-toolbar">
        <div className="admin-filters">
          <select value={provedorFilter} onChange={(e) => setProvedorFilter(e.target.value)}>
            <option value="">Todos os provedores</option>
            {provedorOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            {(Object.keys(STATUS_LABELS) as StatusSincronizacao[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="admin-form__error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Provedor</th>
              <th>Processo</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Duração</th>
              <th>Status</th>
              <th>Erro</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7}>Carregando…</td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhuma execução encontrada.</td>
              </tr>
            )}
            {!loading &&
              items.map((log) => (
                <tr key={log.id}>
                  <td>{log.provedor?.nome ?? log.provedorId}</td>
                  <td>{log.processo}</td>
                  <td>{formatDateTimeBR(log.iniciadoEm)}</td>
                  <td>{formatDateTimeBR(log.finalizadoEm)}</td>
                  <td>{formatDuration(log.iniciadoEm, log.finalizadoEm)}</td>
                  <td>
                    <span className={`admin-status-badge admin-status-badge--${log.status}`}>
                      {STATUS_LABELS[log.status]}
                    </span>
                  </td>
                  <td>
                    {log.mensagemErro ? (
                      <span className="admin-table__cell-truncate" title={log.mensagemErro}>
                        {log.mensagemErro}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <button type="button" className="admin-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
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
          onClick={() => setPage(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
