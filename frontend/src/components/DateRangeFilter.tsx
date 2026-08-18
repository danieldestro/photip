import { useState, type FocusEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { DATE_PRESET_OPTIONS, formatIsoDateBR, rangeForPreset, type DatePresetId, type DateRange } from '../lib/dateRanges';

interface DateRangeFilterProps {
  onChange: (range: DateRange | null) => void;
}

type Selection = { kind: 'none' } | { kind: 'preset'; id: DatePresetId } | { kind: 'custom'; range: DateRange };

export function DateRangeFilter({ onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>({ kind: 'none' });
  const [customMode, setCustomMode] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setOpen(false);
      setCustomMode(false);
    }
  }

  function handleClear() {
    setSelection({ kind: 'none' });
    setCustomMode(false);
    setOpen(false);
    onChange(null);
  }

  function handlePreset(id: DatePresetId) {
    setSelection({ kind: 'preset', id });
    setCustomMode(false);
    setOpen(false);
    onChange(rangeForPreset(id));
  }

  function handleApplyCustom() {
    if (!customStart || !customEnd) return;
    const range = { dataInicio: customStart, dataFim: customEnd };
    setSelection({ kind: 'custom', range });
    setOpen(false);
    setCustomMode(false);
    onChange(range);
  }

  const triggerLabel =
    selection.kind === 'none'
      ? 'Todas as datas'
      : selection.kind === 'preset'
        ? DATE_PRESET_OPTIONS.find((o) => o.id === selection.id)?.label ?? 'Data'
        : `${formatIsoDateBR(selection.range.dataInicio)} – ${formatIsoDateBR(selection.range.dataFim)}`;

  return (
    <div className="date-filter" onBlur={handleBlur}>
      <button
        type="button"
        className="photip-pill-select date-filter__trigger"
        onClick={() => setOpen((o) => !o)}
      >
        {triggerLabel}
        <ChevronDown size={12} strokeWidth={2.4} aria-hidden="true" />
      </button>

      {open && (
        <div className="date-filter__menu">
          <button
            type="button"
            className={`date-filter__option${selection.kind === 'none' ? ' date-filter__option--active' : ''}`}
            onClick={handleClear}
          >
            Todas as datas
          </button>
          {DATE_PRESET_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`date-filter__option${
                selection.kind === 'preset' && selection.id === opt.id ? ' date-filter__option--active' : ''
              }`}
              onClick={() => handlePreset(opt.id)}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            className={`date-filter__option${
              customMode || selection.kind === 'custom' ? ' date-filter__option--active' : ''
            }`}
            onClick={() => setCustomMode(true)}
          >
            Personalizado
          </button>

          {customMode && (
            <div className="date-filter__custom">
              <label className="date-filter__custom-field">
                Início
                <input
                  type="date"
                  value={customStart}
                  max={customEnd || undefined}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </label>
              <label className="date-filter__custom-field">
                Fim
                <input
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="photip-btn photip-btn--primary date-filter__apply"
                disabled={!customStart || !customEnd}
                onClick={handleApplyCustom}
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
