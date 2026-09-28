import { useGetActivityQuery } from '../../api/endpoints';
import { PRIORITIES, STATUSES, labelOf } from '../../utils/constants';
import { formatDateTime, formatDue, timeAgo } from '../../utils/dates';
import { Spinner } from '../ui';

const LABEL = { title: 'title', description: 'description', status: 'status', priority: 'priority', assignee: 'assignee', dueDate: 'due date' };

function show(field, value) {
  if (value == null || value === '') return 'none';
  if (field === 'status') return labelOf(STATUSES, value);
  if (field === 'priority') return labelOf(PRIORITIES, value);
  if (field === 'dueDate') return formatDue(value);
  return value;
}

function describe(entry) {
  if (entry.action === 'created') return ['created the task'];
  if (entry.action === 'commented') return ['added a comment'];
  return entry.changes.map((c) =>
    c.field === 'description' ? (
      'edited the description'
    ) : (
      <>
        changed {LABEL[c.field] ?? c.field} from <em>{show(c.field, c.from)}</em> to <strong>{show(c.field, c.to)}</strong>
      </>
    )
  );
}

export function History({ taskId }) {
  const { data: items = [], isLoading } = useGetActivityQuery(taskId);
  if (isLoading) return <Spinner />;
  if (!items.length) return <p className="muted">No history yet.</p>;
  return (
    <ol className="history">
      {items.map((a) => (
        <li key={a._id} className={`history__item history__item--${a.action}`}>
          <div>
            <strong>{a.actor?.name ?? 'Someone'}</strong>{' '}
            {describe(a).map((line, i) => (
              <span key={i}>{i > 0 && '; '}{line}</span>
            ))}
          </div>
          <time dateTime={a.createdAt} title={formatDateTime(a.createdAt)}>{timeAgo(a.createdAt)}</time>
        </li>
      ))}
    </ol>
  );
}
