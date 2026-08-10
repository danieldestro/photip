import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { CATEGORIA_SEED_DATA } from './categoriaSeedData';
import { FOCO_RADICAL_NOVAS_CATEGORIAS, FOCO_RADICAL_CATEGORIA_MAP } from './focoRadicalSeedData';
import { FOTTO_NOVAS_CATEGORIAS, FOTTO_CATEGORIA_MAP } from './fottoSeedData';

const prisma = new PrismaClient();

// Posição fixa no carrossel de categorias (CategoryPills) pras categorias mais populares, nesta
// ordem exata — todo o resto (Fotop + Foco Radical juntos) vem depois, em ordem alfabética por
// nome. Não afeta o <select> de filtro (FilterSelects), que ordena por nome sempre, independente
// de Categoria.ordem.
const PINNED_CATEGORIA_IDS = [1, 22, 3, 4, 11, 18, 27, 26, 28, 34, 63, 25, 33, 79];

function computeOrdemPorCategoriaId(): Map<number, number> {
  const todas = [...CATEGORIA_SEED_DATA, ...FOCO_RADICAL_NOVAS_CATEGORIAS, ...FOTTO_NOVAS_CATEGORIAS];
  const ordemPorId = new Map<number, number>();
  PINNED_CATEGORIA_IDS.forEach((id, idx) => ordemPorId.set(id, idx + 1));

  const restantes = todas
    .filter((c) => !ordemPorId.has(c.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  restantes.forEach((c, idx) => ordemPorId.set(c.id, PINNED_CATEGORIA_IDS.length + idx + 1));

  return ordemPorId;
}

const ORDEM_POR_CATEGORIA_ID = computeOrdemPorCategoriaId();

// Admin é só um Usuario com perfil=admin — não existe mais tabela separada.
async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) {
    console.warn('ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD não definidos — nenhum admin criado.');
    return;
  }

  const senhaHash = await bcrypt.hash(password, 10);
  try {
    await prisma.usuario.create({ data: { nome: 'Admin', email, senhaHash, perfil: 'admin' } });
    console.log(`Admin criado: ${email}`);
  } catch (err) {
    // P2002 = violação de unicidade em `email` — condição normal quando o seed já rodou antes
    // (ele passa a rodar a cada boot, ver `start` em package.json) ou, em produção com múltiplas
    // réplicas, quando duas instâncias tentam criar o admin ao mesmo tempo.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      console.log(`Admin já existe: ${email}`);
      return;
    }
    throw err;
  }
}

async function seedProvedores(): Promise<{ potofId: number; fotopId: number; focoRadicalId: number; fottoId: number }> {
  const potof = await prisma.provedor.upsert({
    where: { slug: 'potof' },
    update: {},
    create: { slug: 'potof', nome: 'Potof', descricao: 'Potof', proprio: true },
  });
  const fotop = await prisma.provedor.upsert({
    where: { slug: 'fotop' },
    update: {},
    create: {
      slug: 'fotop',
      nome: 'Fotop',
      descricao: 'fotop.com.br',
      urlSite: 'https://fotop.com.br',
      proprio: false,
    },
  });
  const focoRadical = await prisma.provedor.upsert({
    where: { slug: 'foco-radical' },
    update: {},
    create: { slug: 'foco-radical', nome: 'Foco Radical', proprio: false },
  });
  const fotto = await prisma.provedor.upsert({
    where: { slug: 'fotto' },
    update: {},
    create: {
      slug: 'fotto',
      nome: 'Fotto',
      descricao: 'fotto.com.br',
      urlSite: 'https://www.fotto.com.br',
      proprio: false,
    },
  });
  console.log('Provedores seed: Potof, Fotop, Foco Radical, Fotto');
  return { potofId: potof.id, fotopId: fotop.id, focoRadicalId: focoRadical.id, fottoId: fotto.id };
}

// Os ids em CATEGORIA_SEED_DATA são os códigos numéricos do fotop
// (id_estacoes) — ver comentário em categoriaSeedData.ts sobre por que
// Categoria.id fica alinhado a eles em vez de autoincrement livre.
async function seedCategorias(): Promise<void> {
  for (const item of CATEGORIA_SEED_DATA) {
    const ordem = ORDEM_POR_CATEGORIA_ID.get(item.id) ?? 0;
    await prisma.categoria.upsert({
      where: { id: item.id },
      update: { slug: item.slug, nome: item.nome, ordem },
      create: { id: item.id, slug: item.slug, nome: item.nome, ordem },
    });
  }
  console.log(`Categorias seed: ${CATEGORIA_SEED_DATA.length}`);
}

// Mapeamento identidade pro Fotop: como Categoria.id já é o próprio código do
// fotop, idCategoriaProvedor é sempre igual a String(categoriaId). Trivial
// hoje, mas exercita o mesmo mecanismo que o sync de um futuro provedor com
// numeração diferente vai depender de verdade.
async function seedCategoriasProvedores(fotopId: number): Promise<void> {
  for (const item of CATEGORIA_SEED_DATA) {
    const idCategoriaProvedor = String(item.id);
    await prisma.categoriaProvedor.upsert({
      where: { provedorId_idCategoriaProvedor: { provedorId: fotopId, idCategoriaProvedor } },
      update: { categoriaId: item.id },
      create: { categoriaId: item.id, provedorId: fotopId, idCategoriaProvedor },
    });
  }
  console.log(`Mapeamentos categoria-provedor (Fotop) seed: ${CATEGORIA_SEED_DATA.length}`);
}

// Categorias novas trazidas pelo catálogo do Foco Radical — ver comentário em
// focoRadicalSeedData.ts sobre por que elas não seguem o truque de id
// identidade usado pro Fotop.
async function seedFocoRadicalCategorias(): Promise<void> {
  for (const item of FOCO_RADICAL_NOVAS_CATEGORIAS) {
    const ordem = ORDEM_POR_CATEGORIA_ID.get(item.id) ?? 0;
    await prisma.categoria.upsert({
      where: { id: item.id },
      update: { slug: item.slug, nome: item.nome, icone: item.icone ?? null, ordem },
      create: { id: item.id, slug: item.slug, nome: item.nome, icone: item.icone ?? null, ordem },
    });
  }
  console.log(`Categorias seed (Foco Radical): ${FOCO_RADICAL_NOVAS_CATEGORIAS.length}`);
}

async function seedCategoriasProvedoresFocoRadical(focoRadicalId: number): Promise<void> {
  for (const item of FOCO_RADICAL_CATEGORIA_MAP) {
    await prisma.categoriaProvedor.upsert({
      where: {
        provedorId_idCategoriaProvedor: { provedorId: focoRadicalId, idCategoriaProvedor: item.idCategoriaProvedor },
      },
      update: { categoriaId: item.categoriaId },
      create: {
        categoriaId: item.categoriaId,
        provedorId: focoRadicalId,
        idCategoriaProvedor: item.idCategoriaProvedor,
      },
    });
  }
  console.log(`Mapeamentos categoria-provedor (Foco Radical) seed: ${FOCO_RADICAL_CATEGORIA_MAP.length}`);
}

// Categorias novas trazidas pelo catálogo do fotto — ver comentário em fottoSeedData.ts sobre por
// que só "Congresso" e "Festas" precisam de id novo.
async function seedFottoCategorias(): Promise<void> {
  for (const item of FOTTO_NOVAS_CATEGORIAS) {
    const ordem = ORDEM_POR_CATEGORIA_ID.get(item.id) ?? 0;
    await prisma.categoria.upsert({
      where: { id: item.id },
      update: { slug: item.slug, nome: item.nome, ordem },
      create: { id: item.id, slug: item.slug, nome: item.nome, ordem },
    });
  }
  console.log(`Categorias seed (Fotto): ${FOTTO_NOVAS_CATEGORIAS.length}`);
}

async function seedCategoriasProvedoresFotto(fottoId: number): Promise<void> {
  for (const item of FOTTO_CATEGORIA_MAP) {
    await prisma.categoriaProvedor.upsert({
      where: {
        provedorId_idCategoriaProvedor: { provedorId: fottoId, idCategoriaProvedor: item.idCategoriaProvedor },
      },
      update: { categoriaId: item.categoriaId },
      create: {
        categoriaId: item.categoriaId,
        provedorId: fottoId,
        idCategoriaProvedor: item.idCategoriaProvedor,
      },
    });
  }
  console.log(`Mapeamentos categoria-provedor (Fotto) seed: ${FOTTO_CATEGORIA_MAP.length}`);
}

async function main(): Promise<void> {
  await seedAdmin();
  const { fotopId, focoRadicalId, fottoId } = await seedProvedores();
  await seedCategorias();
  await seedCategoriasProvedores(fotopId);
  await seedFocoRadicalCategorias();
  await seedCategoriasProvedoresFocoRadical(focoRadicalId);
  await seedFottoCategorias();
  await seedCategoriasProvedoresFotto(fottoId);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
