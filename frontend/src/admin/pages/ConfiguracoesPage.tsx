import { useEffect, useState, type FormEvent } from 'react';
import { getConfiguracoes, updateConfiguracoes } from '../api';

export function ConfiguracoesPage() {
  const [syncIncrementalDias, setSyncIncrementalDias] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getConfiguracoes()
      .then((config) => setSyncIncrementalDias(config.syncIncrementalDias))
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar configurações.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (syncIncrementalDias === null) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const config = await updateConfiguracoes({ syncIncrementalDias });
      setSyncIncrementalDias(config.syncIncrementalDias);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Configurações</h1>
      </div>

      {loading ? (
        <p>Carregando…</p>
      ) : (
        <form className="admin-settings-form" onSubmit={handleSubmit}>
          <label className="admin-form__field">
            Sincronização incremental: últimos N dias
            <input
              type="number"
              min={1}
              value={syncIncrementalDias ?? ''}
              onChange={(e) => setSyncIncrementalDias(Number.parseInt(e.target.value, 10) || 0)}
              required
            />
          </label>
          <p className="admin-settings-form__hint">
            Janela usada pelo botão "Sincronizar" (incremental) e pelo agendador automático dos
            provedores externos — quantos dias pra trás dos eventos são revarridos em cada ciclo.
            "Sincronizar completo" usa uma janela maior e fixa por provedor, não este valor. Este é
            só o default global: cada provedor pode ter sua própria janela (e teto de páginas por
            execução) na tela Provedores, que substitui este valor quando preenchida.
          </p>
          {error && <p className="admin-form__error">{error}</p>}
          <div className="admin-form__actions">
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            {saved && <span>Salvo.</span>}
          </div>
        </form>
      )}
    </div>
  );
}
