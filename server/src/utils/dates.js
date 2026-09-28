import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: env.timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar date (YYYY-MM-DD) of a timestamp in the app timezone. */
export const calendarDate = (date = new Date()) => fmt.format(date);
export const todayISO = () => calendarDate(new Date());

/** Due dates are date-only values stored at UTC midnight. */
export const dueDateToISO = (date) => (date ? new Date(date).toISOString().slice(0, 10) : null);
export const isoToDueDate = (iso) => (iso ? new Date(`${iso}T00:00:00.000Z`) : null);

/**
 * Business rules for due dates:
 *  - a newly set due date cannot be before today
 *  - a due date cannot be before the date the task was assigned
 */
export function assertValidDueDate({ dueDate, assignedAt, dueDateChanged }) {
  if (!dueDate) return;
  if (dueDateChanged && dueDate < todayISO()) {
    throw ApiError.field('dueDate', 'Due date cannot be in the past');
  }
  if (assignedAt) {
    const assignedOn = calendarDate(assignedAt);
    if (dueDate < assignedOn) {
      throw ApiError.field(
        'dueDate',
        dueDateChanged
          ? `Due date cannot be before the assigned date (${assignedOn})`
          : `The current due date (${dueDate}) is before the new assigned date. Set a new due date.`
      );
    }
  }
}
