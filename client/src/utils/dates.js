/** YYYY-MM-DD in the user's local calendar. */
export const localISO = (date = new Date()) => new Date(date).toLocaleDateString('en-CA');
export const todayISO = () => localISO(new Date());
export const dueISO = (dueDate) => (dueDate ? String(dueDate).slice(0, 10) : '');

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
export const formatDue = (dueDate) =>
  dueDate ? new Date(`${dueISO(dueDate)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const isOverdue = (task) =>
  task.dueDate && !['done', 'closed'].includes(task.status) && dueISO(task.dueDate) < todayISO();

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];

/** "3 hours ago", "yesterday", "just now" */
export function timeAgo(value) {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
