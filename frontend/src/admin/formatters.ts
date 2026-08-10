// Trims a backend ISO timestamp down to what <input type="date"|"datetime-local">
// expects. No timezone conversion — treated as naive wall-clock text, consistent
// with how the form re-serializes it back to the API on submit.
export function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : '';
}

export function toDateTimeInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 16) : '';
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

export function formatNumberBR(n: number): string {
  return n.toLocaleString('pt-BR');
}

// Duração entre início e fim de uma execução (ex: sincronizacoes_log) — null enquanto
// ainda em andamento (sem finalizadoEm).
export function formatDuration(startIso: string, endIso: string | null | undefined): string {
  if (!endIso) return '—';
  const totalSeconds = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
