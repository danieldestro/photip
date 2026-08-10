import { useEffect, useState, type FormEvent } from 'react';
import { toDateInputValue, toDateTimeInputValue } from '../formatters';

export type SelectOption = { value: string | number; label: string };

export type EntityFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'textarea'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select';

export interface EntityField {
  key: string;
  label: string;
  type: EntityFieldType;
  required?: boolean;
  placeholder?: string;
  /** Only for type "select" — static list, for small fixed sets (e.g. perfil admin/user). */
  options?: SelectOption[];
  /** Only for type "select" — loaded once when the form opens (e.g. active categorias/provedores). */
  loadOptions?: () => Promise<SelectOption[]>;
}

interface EntityFormProps {
  title: string;
  fields: EntityField[];
  initialValues: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

function renderInput(
  field: EntityField,
  value: unknown,
  setField: (key: string, value: unknown) => void,
  options: SelectOption[]
) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea rows={3} value={(value as string) ?? ''} onChange={(e) => setField(field.key, e.target.value)} />
      );
    case 'boolean':
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => setField(field.key, e.target.checked)}
        />
      );
    case 'date':
      return (
        <input
          type="date"
          value={toDateInputValue(value as string)}
          onChange={(e) => setField(field.key, e.target.value)}
          required={field.required}
        />
      );
    case 'datetime':
      return (
        <input
          type="datetime-local"
          value={toDateTimeInputValue(value as string)}
          onChange={(e) => setField(field.key, e.target.value)}
          required={field.required}
        />
      );
    case 'select':
      return (
        <select
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(e) => setField(field.key, e.target.value)}
          required={field.required}
        >
          <option value="">Selecione…</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case 'email':
      return (
        <input
          type="email"
          value={(value as string) ?? ''}
          onChange={(e) => setField(field.key, e.target.value)}
          required={field.required}
        />
      );
    case 'password':
      return (
        <input
          type="password"
          value={(value as string) ?? ''}
          onChange={(e) => setField(field.key, e.target.value)}
          required={field.required}
          placeholder={field.placeholder}
          autoComplete="new-password"
        />
      );
    case 'number':
      return (
        <input
          type="number"
          value={value === undefined || value === null ? '' : (value as number)}
          onChange={(e) => setField(field.key, e.target.value === '' ? null : Number(e.target.value))}
          required={field.required}
          placeholder={field.placeholder}
        />
      );
    case 'text':
    default:
      return (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => setField(field.key, e.target.value)}
          required={field.required}
        />
      );
  }
}

export function EntityForm({ title, fields, initialValues, onSubmit, onClose }: EntityFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [selectOptions, setSelectOptions] = useState<Record<string, SelectOption[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fields.forEach((field) => {
      if (field.type === 'select' && field.loadOptions) {
        field.loadOptions().then((opts) => setSelectOptions((prev) => ({ ...prev, [field.key]: opts })));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-modal__backdrop" onClick={onClose}>
      <div className="admin-modal__card" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <form onSubmit={handleSubmit}>
          {fields.map((field) => (
            <label key={field.key} className="admin-form__field">
              {field.label}
              {renderInput(field, values[field.key], setField, selectOptions[field.key] ?? field.options ?? [])}
            </label>
          ))}
          {error && <p className="admin-form__error">{error}</p>}
          <div className="admin-form__actions">
            <button type="button" className="admin-btn" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={submitting}>
              {submitting ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
