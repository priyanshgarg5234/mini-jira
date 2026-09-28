import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { parseApiError } from '../api/baseApi';
import { useGetCommentsQuery, useGetProjectQuery, useGetTaskQuery, useUpdateTaskMutation } from '../api/endpoints';
import { Comments } from '../components/task/Comments';
import { History } from '../components/task/History';
import { projectPeople, validateTask } from '../components/tasks/taskRules';
import { Avatar, Button, ErrorBanner, PriorityBadge, Spinner, StatusBadge, UserPicker } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { PRIORITIES, STATUSES, labelOf } from '../utils/constants';
import { dueISO, formatDate, formatDateTime, isOverdue, timeAgo } from '../utils/dates';

const asForm = (task) => ({
  project: task.project._id,
  title: task.title,
  description: task.description ?? '',
  priority: task.priority,
  status: task.status,
  assignee: task.assignee?._id ?? '',
  dueDate: dueISO(task.dueDate),
});

/**
 * The task screen: the only place where a task's status, assignee and other
 * fields are changed. Detail fields save as soon as they change; title and
 * description have their own edit/save.
 */
export function TaskDetailPage() {
  const { taskId } = useParams();
  const toast = useToast();
  const { data, isLoading, error } = useGetTaskQuery(taskId);
  const task = data?.task;
  const { data: project } = useGetProjectQuery(task?.project._id, { skip: !task });
  const { data: comments = [] } = useGetCommentsQuery(taskId);
  const [updateTask, { isLoading: saving }] = useUpdateTaskMutation();
  const people = useMemo(() => projectPeople(project), [project]);

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [tab, setTab] = useState('comments');
  const [copied, setCopied] = useState(false);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner error={parseApiError(error)} />;

  const { permissions } = data;
  const closed = task.status === 'closed';
  const overdue = isOverdue(task);

  /** PATCH one or more fields, after running the same checks as the server. */
  const save = async (patch, message) => {
    const { errors } = validateTask({ ...asForm(task), ...patch, assignee: patch.assignee ?? (('assignee' in patch) ? '' : asForm(task).assignee) }, task);
    const relevant = Object.fromEntries(Object.entries(errors).filter(([k]) => k in patch));
    setFieldErrors(relevant);
    if (Object.keys(relevant).length) return false;
    try {
      await updateTask({ id: task._id, ...patch }).unwrap();
      toast.success(message);
      return true;
    } catch (err) {
      const parsed = parseApiError(err);
      setFieldErrors(parsed.fields);
      if (!Object.keys(parsed.fields).length) toast.error(parsed.message);
      return false;
    }
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(`${task.key} ${task.title}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/projects">Projects</Link> / <Link to={`/projects/${task.project._id}`}>{task.project.name}</Link> / <span>{task.key}</span>
      </nav>

      {/* ---------- Header ---------- */}
      <header className="task-hero">
        <div className="task-hero__top">
          <button type="button" className="key-chip" onClick={copyKey} title="Copy key and title">
            {task.key}
            <span className="key-chip__hint">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {overdue && <span className="badge badge--overdue">Overdue</span>}
        </div>

        {editingTitle ? (
          <form
            className="title-edit"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await save({ title: title.trim() }, 'Title updated')) setEditingTitle(false);
            }}
          >
            <input className="input input--title" value={title} maxLength={200} autoFocus aria-label="Title"
              onChange={(e) => { setTitle(e.target.value); setFieldErrors({}); }} />
            <Button type="submit" size="sm" loading={saving}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => { setEditingTitle(false); setFieldErrors({}); }}>Cancel</Button>
            {fieldErrors.title && <p className="field__error title-edit__error">{fieldErrors.title}</p>}
          </form>
        ) : (
          <h1 className="task-hero__title">
            {task.title}
            {permissions.canEdit && (
              <button type="button" className="btn btn--link btn--tiny" onClick={() => { setTitle(task.title); setEditingTitle(true); }}>
                Edit title
              </button>
            )}
          </h1>
        )}

        <p className="task-hero__meta">
          Created by <strong>{task.reporter?.name ?? 'unknown'}</strong> on {formatDate(task.createdAt)} · Updated{' '}
          <time dateTime={task.updatedAt} title={formatDateTime(task.updatedAt)}>{timeAgo(task.updatedAt)}</time>
        </p>
      </header>

      {closed && (
        <div className="alert alert--info" role="status">
          <span>This task is closed and read-only. You can still comment.</span>
          <Button variant="secondary" size="sm" loading={saving} onClick={() => save({ status: 'todo' }, `${task.key} reopened`)}>
            Reopen task
          </Button>
        </div>
      )}

      <div className="task-layout">
        {/* ---------- Main column ---------- */}
        <div className="task-layout__main">
          <section className="panel">
            <header className="panel__head">
              <h2>Description</h2>
              {permissions.canEdit && !editingDesc && (
                <button type="button" className="btn btn--link" onClick={() => { setDescription(task.description ?? ''); setEditingDesc(true); }}>
                  Edit
                </button>
              )}
            </header>
            <div className="panel__body">
              {editingDesc ? (
                <div className="stack stack--tight">
                  <textarea className="input textarea" rows={8} value={description} autoFocus aria-label="Description"
                    onChange={(e) => setDescription(e.target.value)} />
                  <div className="row">
                    <Button size="sm" loading={saving}
                      onClick={async () => { if (await save({ description: description.trim() }, 'Description updated')) setEditingDesc(false); }}>
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingDesc(false)}>Cancel</Button>
                  </div>
                </div>
              ) : task.description ? (
                <p className="prose">{task.description}</p>
              ) : (
                <p className="muted">No description yet.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="tabs tabs--panel" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'comments'} onClick={() => setTab('comments')}>
                Comments <span className="count">{comments.length}</span>
              </button>
              <button type="button" role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>
                History
              </button>
            </div>
            <div className="panel__body">{tab === 'comments' ? <Comments taskId={task._id} /> : <History taskId={task._id} />}</div>
          </section>
        </div>

        {/* ---------- Details sidebar ---------- */}
        <aside className="task-layout__side">
          <section className="panel">
            <header className="panel__head"><h2>Details</h2></header>
            <div className="panel__body details">
              <label className="details__label" htmlFor="f-status">Status</label>
              <select id="f-status" className={`input status-select status-select--${task.status}`} value={task.status} disabled={closed || saving}
                onChange={(e) => save({ status: e.target.value }, e.target.value === 'closed' ? `${task.key} closed` : `Status set to ${labelOf(STATUSES, e.target.value)}`)}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>

              <label className="details__label" htmlFor="f-priority">Priority</label>
              <select id="f-priority" className="input" value={task.priority} disabled={closed || saving}
                onChange={(e) => save({ priority: e.target.value }, `Priority set to ${labelOf(PRIORITIES, e.target.value)}`)}>
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>

              <label className="details__label" htmlFor="f-assignee">Assignee</label>
              <div>
                <UserPicker
                  id="f-assignee"
                  people={people}
                  value={task.assignee?._id ?? ''}
                  allowClear
                  placeholder="Type a name to assign"
                  disabled={!permissions.canReassign || saving}
                  onChange={(userId) => {
                    const name = people.find((p) => p._id === userId)?.name;
                    save({ assignee: userId }, userId ? `Assigned to ${name}` : 'Task unassigned');
                  }}
                />
                {fieldErrors.assignee && <p className="field__error">{fieldErrors.assignee}</p>}
                {!closed && !permissions.canReassign && <p className="field__hint">Only an admin or the current assignee can reassign.</p>}
                {task.assignedAt && <p className="field__hint">Assigned {formatDate(task.assignedAt)}</p>}
              </div>

              <label className="details__label" htmlFor="f-due">Due date</label>
              <div>
                <input id="f-due" type="date" className={`input ${fieldErrors.dueDate ? 'input--error' : ''} ${overdue ? 'text-danger' : ''}`}
                  value={dueISO(task.dueDate)} min={validateTask(asForm(task), task).minDueDate} disabled={closed || saving}
                  onChange={(e) => save({ dueDate: e.target.value || null }, e.target.value ? 'Due date updated' : 'Due date removed')} />
                {fieldErrors.dueDate && <p className="field__error" role="alert">{fieldErrors.dueDate}</p>}
              </div>

              <hr className="details__rule" />

              <span className="details__label">Project</span>
              <Link to={`/projects/${task.project._id}`}>{task.project.key} · {task.project.name}</Link>

              <span className="details__label">Reporter</span>
              <span className="details__person"><Avatar user={task.reporter} size={24} /> {task.reporter?.name ?? 'Unknown'}</span>

              <span className="details__label">Created</span>
              <span>{formatDateTime(task.createdAt)}</span>
            </div>
          </section>
          {!closed && (
            <Button variant="secondary" className="btn--block" loading={saving} onClick={() => save({ status: 'closed' }, `${task.key} closed`)}>
              Close task
            </Button>
          )}
        </aside>
      </div>
    </>
  );
}
