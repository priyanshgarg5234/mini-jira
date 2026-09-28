import { useEffect, useState } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { PRIORITIES, STATUSES } from '../../utils/constants';

const KEYS = ['q', 'project', 'status', 'priority', 'assignee', 'overdue', 'closed'];

/** Filters live in the URL: shareable, bookmarkable, and they survive refresh. */
export function TaskFilters({ params, setParams, projects, showProjectFilter = true }) {
  const [search, setSearch] = useState(params.get('q') ?? '');
  const debounced = useDebounce(search, 350);

  const update = (key, value) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete('page'); // new filter -> back to page 1
        return next;
      },
      { replace: true }
    );

  useEffect(() => {
    if ((params.get('q') ?? '') !== debounced) update('q', debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const active = KEYS.some((k) => params.get(k));
  const select = (key, label, options) => (
    <select className="input" aria-label={label} value={params.get(key) ?? ''} onChange={(e) => update(key, e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="filters" role="search">
      <input
        type="search"
        className="input filters__search"
        placeholder="Search title, key or description"
        aria-label="Search tasks"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {showProjectFilter &&
        select('project', 'Project', [{ value: '', label: 'All projects' }, ...projects.map((p) => ({ value: p._id, label: p.name }))])}
      {select('status', 'Status', [{ value: '', label: 'Any status' }, ...STATUSES])}
      {select('priority', 'Priority', [{ value: '', label: 'Any priority' }, ...PRIORITIES])}
      {select('assignee', 'Assignee', [
        { value: '', label: 'Anyone' },
        { value: 'me', label: 'Assigned to me' },
        { value: 'unassigned', label: 'Unassigned' },
      ])}
      <label className="checkbox">
        <input type="checkbox" checked={params.get('overdue') === 'true'} onChange={(e) => update('overdue', e.target.checked ? 'true' : '')} />
        Overdue only
      </label>
      {!params.get('status') && (
        <label className="checkbox">
          <input type="checkbox" checked={params.get('closed') === 'true'} onChange={(e) => update('closed', e.target.checked ? 'true' : '')} />
          Show closed
        </label>
      )}
      {active && (
        <button
          type="button"
          className="btn btn--link"
          onClick={() => {
            setSearch('');
            setParams((prev) => {
              const next = new URLSearchParams(prev);
              KEYS.concat('page').forEach((k) => next.delete(k));
              return next;
            }, { replace: true });
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
