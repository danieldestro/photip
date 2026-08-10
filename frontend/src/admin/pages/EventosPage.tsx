import { useEffect, useState } from 'react';
import { categoriasApi, eventosApi, provedoresApi } from '../api';
import { EntityCrudPage } from '../components/EntityCrudPage';
import type { EntityColumn } from '../components/EntityTable';
import type { EntityField } from '../components/EntityForm';
import type { SelectOption } from '../components/EntityForm';
import { formatDateTimeBR } from '../formatters';
import { ESTADOS } from '../../data/estados';
import type { Evento } from '../types';

const COLUMNS: EntityColumn<Evento>[] = [
  {
    key: 'urlCapa',
    label: 'Capa',
    render: (e) => (e.urlCapa ? <img src={e.urlCapa} alt="" className="admin-thumb" /> : '—'),
  },
  { key: 'nome', label: 'Nome' },
  { key: 'categoria', label: 'Categoria', render: (e) => e.categoria?.nome ?? e.categoriaId },
  { key: 'provedor', label: 'Provedor', render: (e) => e.provedor?.nome ?? e.provedorId },
  { key: 'dataHora', label: 'Data/hora', render: (e) => formatDateTimeBR(e.dataHora) },
  { key: 'cidade', label: 'Cidade/UF', render: (e) => [e.cidade, e.uf].filter(Boolean).join(' - ') || '—' },
];

const FIELDS: EntityField[] = [
  { key: 'nome', label: 'Nome', type: 'text', required: true },
  { key: 'descricao', label: 'Descrição', type: 'textarea' },
  { key: 'local', label: 'Local', type: 'text' },
  { key: 'dataHora', label: 'Data/hora', type: 'datetime', required: true },
  { key: 'cidade', label: 'Cidade', type: 'text' },
  { key: 'uf', label: 'UF', type: 'text' },
  { key: 'pais', label: 'País', type: 'text' },
  {
    key: 'categoriaId',
    label: 'Categoria',
    type: 'select',
    required: true,
    loadOptions: () =>
      categoriasApi
        .list({ ativo: true, pageSize: 200 })
        .then((res) => res.items.map((c) => ({ value: c.id, label: c.nome }))),
  },
  {
    key: 'provedorId',
    label: 'Provedor',
    type: 'select',
    required: true,
    loadOptions: () =>
      provedoresApi
        .list({ ativo: true, pageSize: 200 })
        .then((res) => res.items.map((p) => ({ value: p.id, label: p.nome }))),
  },
  { key: 'idEventoProvedor', label: 'ID do evento no provedor', type: 'text' },
  { key: 'urlSite', label: 'URL do site', type: 'text' },
  { key: 'urlCapa', label: 'URL da capa', type: 'text' },
  { key: 'searchSelfie', label: 'Busca por selfie', type: 'boolean' },
  { key: 'searchBib', label: 'Busca por número de peito', type: 'boolean' },
  { key: 'searchName', label: 'Busca por nome', type: 'boolean' },
  { key: 'ativo', label: 'Ativo', type: 'boolean' },
];

const UF_OPTIONS = ESTADOS.map((e) => ({ value: e.id, label: e.descricao }));

export function EventosPage() {
  const [categoriaOptions, setCategoriaOptions] = useState<SelectOption[]>([]);
  const [provedorOptions, setProvedorOptions] = useState<SelectOption[]>([]);
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [provedorFilter, setProvedorFilter] = useState('');
  const [ufFilter, setUfFilter] = useState('');

  useEffect(() => {
    categoriasApi
      .list({ pageSize: 200 })
      .then((res) =>
        setCategoriaOptions(
          res.items
            .map((c) => ({ value: c.id, label: c.nome }))
            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
        ),
      )
      .catch((err) => console.error('[EventosPage] falha ao carregar categorias', err));
    provedoresApi
      .list({ pageSize: 200 })
      .then((res) => setProvedorOptions(res.items.map((p) => ({ value: p.id, label: p.nome }))))
      .catch((err) => console.error('[EventosPage] falha ao carregar provedores', err));
  }, []);

  return (
    <EntityCrudPage
      title="Eventos"
      api={eventosApi}
      columns={COLUMNS}
      fields={FIELDS}
      defaultCreateValues={{ ativo: true, pais: 'BR', searchSelfie: false, searchBib: false, searchName: false }}
      extraParams={{
        categoriaId: categoriaFilter || undefined,
        provedorId: provedorFilter || undefined,
        uf: ufFilter || undefined,
      }}
      filters={
        <>
          <select value={categoriaFilter} onChange={(e) => setCategoriaFilter(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categoriaOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select value={provedorFilter} onChange={(e) => setProvedorFilter(e.target.value)}>
            <option value="">Todos os provedores</option>
            {provedorOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select value={ufFilter} onChange={(e) => setUfFilter(e.target.value)}>
            <option value="">Todas as UFs</option>
            {UF_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </>
      }
    />
  );
}
