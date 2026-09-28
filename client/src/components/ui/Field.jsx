import { useId } from 'react';

function Field({ label, required, error, hint, className = '', children }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
          {required && <span className="field__required" aria-hidden="true"> *</span>}
        </label>
      )}
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, 'aria-required': required || undefined })}
      {error ? (
        <p className="field__error" id={`${id}-error`} role="alert">{error}</p>
      ) : hint ? (
        <p className="field__hint" id={`${id}-hint`}>{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = ({ label, required, error, hint, className, ...props }) => (
  <Field label={label} required={required} error={error} hint={hint} className={className}>
    {(a) => <input className="input" {...a} {...props} />}
  </Field>
);

export const Textarea = ({ label, required, error, hint, className, ...props }) => (
  <Field label={label} required={required} error={error} hint={hint} className={className}>
    {(a) => <textarea className="input textarea" {...a} {...props} />}
  </Field>
);

export const Select = ({ label, required, error, hint, options, placeholder, className, ...props }) => (
  <Field label={label} required={required} error={error} hint={hint} className={className}>
    {(a) => (
      <select className="input" {...a} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )}
  </Field>
);
