import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const initials = (name = '') =>
  name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

/**
 * Searchable user picker (ARIA combobox).
 * Click to see every suggestion, type to filter by name or email,
 * use ↑ ↓ Enter to choose, Esc to cancel.
 *
 * The suggestion list is rendered in a portal with fixed positioning so it
 * isn't clipped by scrolling tables or modals.
 */
export function UserPicker({
  people,
  value, // selected user id or ''/null
  onChange, // (id | null) => void
  label,
  placeholder = 'Search people…',
  allowClear = false,
  clearLabel = 'Unassigned',
  disabled = false,
  compact = false,
  error,
  hint,
  id: idProp,
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const listId = `${id}-list`;
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const selected = people.find((p) => p._id === value) ?? null;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState(null);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = people.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
    );
    return allowClear && !q ? [{ _id: '', name: clearLabel, clear: true }, ...matches] : matches;
  }, [people, query, allowClear, clearLabel]);

  // Keep the popup attached to the input while the page or a table scrolls.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => setRect(inputRef.current?.getBoundingClientRect() ?? null);
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!inputRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function openList() {
    if (disabled) return;
    setQuery('');
    const idx = options.findIndex((o) => o._id === (value ?? ''));
    setActive(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuery('');
  }

  function choose(option) {
    close();
    const next = option.clear ? null : option._id;
    if ((next ?? '') !== (value ?? '')) onChange(next);
    inputRef.current?.blur();
  }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.nativeEvent.stopPropagation(); // don't also close a surrounding modal
      close();
    } else if (e.key === 'Tab') {
      close();
    }
  }

  const displayValue = open ? query : selected?.name ?? '';

  const input = (
    <div className={`picker ${compact ? 'picker--compact' : ''} ${open ? 'picker--open' : ''}`}>
      {!open && selected && <span className="picker__avatar" aria-hidden="true">{initials(selected.name)}</span>}
      <input
        ref={inputRef}
        id={id}
        className={`input picker__input ${compact ? 'input--sm' : ''} ${!open && selected ? 'picker__input--with-avatar' : ''}`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${id}-opt-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        placeholder={open && selected ? selected.name : selected ? '' : placeholder}
        value={displayValue}
        disabled={disabled}
        autoComplete="off"
        onFocus={openList}
        onClick={() => !open && openList()}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          if (!open) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      <span className="picker__caret" aria-hidden="true">▾</span>
    </div>
  );

  const list =
    open && rect
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="picker__list"
            style={{
              top: Math.min(rect.bottom + 4, window.innerHeight - 60),
              left: Math.min(rect.left, window.innerWidth - Math.max(rect.width, 260) - 8),
              width: Math.max(rect.width, 260),
            }}
          >
            {options.length === 0 && <li className="picker__empty">No one matches “{query}”</li>}
            {options.map((o, i) => (
              <li
                key={o._id || 'clear'}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={(value ?? '') === o._id}
                data-active={i === active}
                className={`picker__option ${i === active ? 'is-active' : ''} ${o.clear ? 'picker__option--clear' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()} // keep focus in the input
                onClick={() => choose(o)}
              >
                {o.clear ? (
                  <span>{o.name}</span>
                ) : (
                  <>
                    <span className="picker__avatar" aria-hidden="true">{initials(o.name)}</span>
                    <span className="picker__text">
                      <span>{o.name}</span>
                      {o.email && <span className="small muted">{o.email}</span>}
                    </span>
                    {(value ?? '') === o._id && <span className="picker__check" aria-hidden="true">✓</span>}
                  </>
                )}
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  if (!label) {
    return (
      <>
        {input}
        {list}
      </>
    );
  }
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label className="field__label" htmlFor={id}>{label}</label>
      {input}
      {list}
      {error ? <p className="field__error" role="alert">{error}</p> : hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}
