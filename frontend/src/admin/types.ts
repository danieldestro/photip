export interface AdminSession {
  id: number;
  nome: string;
  email: string;
}

export interface Configuracoes {
  syncIncrementalDias: number;
}

export interface Provedor {
  id: number;
  slug: string;
  nome: string;
  descricao: string | null;
  urlSite: string | null;
  ativo: boolean;
  proprio: boolean;
  ultimaSincronizacaoEm: string | null;
  ultimaSincronizacaoResultado: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StatusSincronizacao = 'em_andamento' | 'sucesso' | 'erro';

export interface SincronizacaoLog {
  id: number;
  processo: string;
  provedorId: number;
  provedor?: Provedor;
  iniciadoEm: string;
  finalizadoEm: string | null;
  status: StatusSincronizacao;
  mensagemErro: string | null;
}

export interface Categoria {
  id: number;
  slug: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  ordem: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Evento {
  id: number;
  nome: string;
  descricao: string | null;
  local: string | null;
  dataHora: string;
  cidade: string | null;
  uf: string | null;
  pais: string | null;
  categoriaId: number;
  categoria?: Categoria;
  searchSelfie: boolean;
  searchBib: boolean;
  searchName: boolean;
  provedorId: number;
  provedor?: Provedor;
  idEventoProvedor: string | null;
  urlSite: string | null;
  urlCapa: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Perfil = 'admin' | 'user';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  cpf: string | null;
  dataNascimento: string | null;
  cidade: string | null;
  uf: string | null;
  pais: string | null;
  perfil: Perfil;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Fotografo {
  id: number;
  usuarioId: number;
  usuario?: Usuario;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Foto {
  id: number;
  eventoId: number;
  evento?: Evento;
  fotografoId: number;
  fotografo?: Fotografo;
  urlFoto: string;
  urlThumb: string | null;
  takenAt: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}
