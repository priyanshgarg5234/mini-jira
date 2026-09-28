import { Link } from 'react-router-dom';
import { formatDue, isOverdue } from '../../utils/dates';
import { PriorityBadge, StatusBadge } from '../ui';

const SORTABLE = { priority: 'Priority', dueDate: 'Due date', updatedAt: 'Updated' };

/**
 * Read-only task list. Status and assignee are changed inside the task:
 * click the key or title to open it.
 */
export function TaskTable({ tasks, sort, onSort, showProject = true }) {
  const sortHeader = (field) => {
    const activeField = sort.replace('-', '') === field;
    const desc = sort.startsWith('-');
    return (
      <th scope="col" aria-sort={activeField ? (desc ? 'descending' : 'ascending') : 'none'}>
        <button type="button" className="th-sort" onClick={() => onSort(activeField && desc ? field : `-${field}`)}>
          {SORTABLE[field]} {activeField ? (desc ? '▼' : '▲') : ''}
        </button>
      </th>
    );
  };

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Key</th>
            <th scope="col">Title</th>
            <th scope="col">Status</th>
            {sortHeader('priority')}
            <th scope="col">Assignee</th>
            {sortHeader('dueDate')}
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t._id} className={t.status === 'closed' ? 'row--muted' : ''}>
              <td className="nowrap">
                <Link to={`/tasks/${t._id}`} className="task-key task-key--link" title="Open task">{t.key}</Link>
              </td>
              <td>
                <Link to={`/tasks/${t._id}`} className="table__title">{t.title}</Link>
                {showProject && <div className="small muted">{t.project?.name}</div>}
              </td>
              <td><StatusBadge status={t.status} /></td>
              <td><PriorityBadge priority={t.priority} /></td>
              <td className="nowrap">{t.assignee?.name ?? <span className="muted">Unassigned</span>}</td>
              <td className={`nowrap ${isOverdue(t) ? 'text-danger' : ''}`}>
                {formatDue(t.dueDate) || <span className="muted">—</span>}
                {isOverdue(t) && <span className="sr-only"> (overdue)</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
