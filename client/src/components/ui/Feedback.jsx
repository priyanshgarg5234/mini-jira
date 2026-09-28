import { useDispatch, useSelector } from 'react-redux';
import { toastRemoved } from '../../features/ui/toastSlice';

export const Spinner = ({ label = 'Loading' }) => (
  <div className="center" role="status">
    <span className="spinner" aria-hidden="true" />
    <span className="sr-only">{label}</span>
  </div>
);

export const EmptyState = ({ title, children, action }) => (
  <div className="empty">
    <p className="empty__title">{title}</p>
    {children && <p className="muted">{children}</p>}
    {action}
  </div>
);

export const ErrorBanner = ({ error, onRetry }) =>
  error ? (
    <div className="alert alert--error" role="alert">
      <div>
        <p>{error.message}</p>
        {error.requestId && <p className="small muted">Reference: {error.requestId}</p>}
      </div>
      {onRetry && <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>Try again</button>}
    </div>
  ) : null;

export const PageHeader = ({ title, subtitle, actions }) => (
  <header className="page-header">
    <div>
      <h1>{title}</h1>
      {subtitle && <p className="muted">{subtitle}</p>}
    </div>
    {actions && <div className="page-header__actions">{actions}</div>}
  </header>
);

export function Toasts() {
  const toasts = useSelector((s) => s.toasts);
  const dispatch = useDispatch();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>
          <span>{t.message}</span>
          <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => dispatch(toastRemoved(t.id))}>×</button>
        </div>
      ))}
    </div>
  );
}
