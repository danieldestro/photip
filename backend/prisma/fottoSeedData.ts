// Categorias do provedor externo fotto (GET https://api.fotto.com.br/api/categories — só 10 no
// catálogo inteiro, confirmado manualmente). A maioria já tem equivalente direto na taxonomia
// existente (nomeada pelo Fotop ou pelo Foco Radical), então reaproveita o Categoria.id delas em
// vez de duplicar — só "Congresso" e "Festas" não têm equivalente e ganham id novo, sequencial
// após o maior id usado até aqui (187, ver focoRadicalSeedData.ts).
export interface FottoCategoriaItem {
  idCategoriaProvedor: string;
  nomeOriginal: string;
  categoriaId: number;
}

export const FOTTO_NOVAS_CATEGORIAS: { id: number; slug: string; nome: string }[] = [
  { id: 188, slug: 'congresso', nome: 'Congresso' },
  { id: 189, slug: 'festas', nome: 'Festas' },
];

export const FOTTO_CATEGORIA_MAP: FottoCategoriaItem[] = [
  { idCategoriaProvedor: '1', nomeOriginal: 'Corrida', categoriaId: 1 }, // Corrida de rua
  { idCategoriaProvedor: '6', nomeOriginal: 'Beach Tennis', categoriaId: 26 }, // Beach Tênis
  { idCategoriaProvedor: '10', nomeOriginal: 'Vôlei', categoriaId: 34 }, // Vôlei
  { idCategoriaProvedor: '15', nomeOriginal: 'Crossfit', categoriaId: 27 }, // Crossfit
  { idCategoriaProvedor: '16', nomeOriginal: 'Congresso', categoriaId: 188 }, // Congresso
  { idCategoriaProvedor: '21', nomeOriginal: 'Basquete', categoriaId: 25 }, // Basquete
  { idCategoriaProvedor: '25', nomeOriginal: 'Futebol', categoriaId: 3 }, // Futebol
  { idCategoriaProvedor: '27', nomeOriginal: 'Futsal', categoriaId: 63 }, // Futsal
  { idCategoriaProvedor: '30', nomeOriginal: 'Handball', categoriaId: 36 }, // Handebol
  { idCategoriaProvedor: '53', nomeOriginal: 'Festas', categoriaId: 189 }, // Festas
];
