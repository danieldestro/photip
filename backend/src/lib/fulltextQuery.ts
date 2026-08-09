// Caracteres com significado especial na mini-linguagem do MySQL/InnoDB
// BOOLEAN MODE (+ - > < ( ) ~ * " @) — removidos de cada palavra antes de montar a
// expressão, senão o AGAINST(...) pode virar sintaxe inválida (ou se comportar
// de um jeito inesperado, tipo um "-palavra" virando "excluir" em vez de
// "obrigatória"). Isso não é uma questão de SQL injection — os parâmetros
// continuam indo via bind (Prisma.sql) — é só sanear a query de busca em si.
const BOOLEAN_MODE_SPECIAL_CHARS = /[+\-><()~*"@]/g;

// Monta "+termo1* +termo2*" a partir do texto digitado: cada palavra vira
// obrigatória (+) e casa por prefixo (*) — bom pra busca "digitando"
// (autocomplete da Home) e exige todas as palavras em qualquer ordem
// (listagem de /eventos). Retorna null se não sobrar nenhum token válido
// (ex: usuário só digitou símbolos) — nesse caso o chamador deve ignorar o
// filtro de nome em vez de forçar zero resultados.
export function buildBooleanExpression(texto: string): string | null {
  const tokens = texto
    .split(/\s+/)
    .map((word) => word.replace(BOOLEAN_MODE_SPECIAL_CHARS, '').trim())
    .filter((word) => word.length > 0);

  if (tokens.length === 0) return null;

  return tokens.map((token) => `+${token}*`).join(' ');
}
