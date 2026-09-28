export const STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'in_review', label: 'In review' },
  { value: 'done', label: 'Done' },
  { value: 'closed', label: 'Closed' },
];
/** Default list view hides closed tasks. */
export const OPEN_STATUS_FILTER = 'todo,in_progress,in_review,done';
export const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
export const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' },
];
export const labelOf = (list, value) => list.find((x) => x.value === value)?.label ?? value;
