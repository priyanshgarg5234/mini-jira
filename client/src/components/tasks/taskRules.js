import { dueISO, localISO, todayISO } from '../../utils/dates';

const idOf = (v) => (v?._id ?? v ?? '');

/**
 * Everyone who can be assigned tasks in a project: people added directly
 * plus the members of each of its teams (active users only).
 */
export const projectPeople = (project) => {
  if (!project) return [];
  const all = [...(project.members ?? []), ...(project.teams ?? []).flatMap((t) => t.members ?? [])].filter(
    (u) => u && u._id && u.isActive !== false
  );
  const seen = new Set();
  return all.filter((u) => !seen.has(u._id) && seen.add(u._id)).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Same rules as the server:
 *  - title (3+ chars), project and priority are required
 *  - a new/changed due date cannot be before today
 *  - a due date cannot be before the date the task was assigned
 */
export function validateTask(values, original) {
  const errors = {};
  const title = values.title.trim();
  if (!title) errors.title = 'Title is required';
  else if (title.length < 3) errors.title = 'Title must be at least 3 characters';
  if (!values.project) errors.project = 'Project is required';
  if (!values.priority) errors.priority = 'Priority is required';

  const today = todayISO();
  const dueChanged = values.dueDate !== dueISO(original?.dueDate);
  const assigneeChanged = values.assignee !== idOf(original?.assignee);
  const assignedOn = values.assignee
    ? assigneeChanged ? today : original?.assignedAt ? localISO(original.assignedAt) : null
    : null;

  if (values.dueDate && (dueChanged || assigneeChanged)) {
    if (dueChanged && values.dueDate < today) errors.dueDate = 'Due date cannot be in the past';
    else if (assignedOn && values.dueDate < assignedOn) {
      errors.dueDate = dueChanged
        ? `Due date cannot be before the assigned date (${assignedOn})`
        : 'The current due date is before today’s assignment. Choose a new due date.';
    }
  }
  return { errors, minDueDate: assignedOn && assignedOn > today ? assignedOn : today };
}
