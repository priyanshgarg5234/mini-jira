import { useId, useState } from 'react';

/** Multi-select as a searchable list of checkboxes. */
export function CheckboxList({ label, hint, error, options, value, onChange, emptyText = 'Nothing to choose from' }) {
  const id = useId();
  const [filter, setFilter] = useState('');
  const shown = options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()));
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <fieldset className={`field checklist ${error ? 'field--error' : ''}`} aria-describedby={error ? `${id}-e` : undefined}>
      <legend className="field__label">{label} {value.length > 0 && <span className="muted">({value.length} selected)</span>}</legend>
      {options.length > 6 && (
        <input className="input input--sm checklist__filter" placeholder="Filter…" aria-label={`Filter ${label}`} value={filter} onChange={(e) => setFilter(e.target.value)} />
      )}
      <div className="checklist__box">
        {shown.length === 0 && <p className="small muted">{emptyText}</p>}
        {shown.map((o) => (
          <label key={o.value} className="checkbox checklist__item">
            <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
            <span>{o.label}{o.hint && <span className="small muted"> · {o.hint}</span>}</span>
          </label>
        ))}
      </div>
      {error ? <p className="field__error" id={`${id}-e`}>{error}</p> : hint ? <p className="field__hint">{hint}</p> : null}
    </fieldset>
  );
}
