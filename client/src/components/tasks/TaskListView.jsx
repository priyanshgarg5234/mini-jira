import { useSearchParams } from 'react-router-dom';
import { parseApiError } from '../../api/baseApi';
import { useGetProjectsQuery, useGetTasksQuery } from '../../api/endpoints';
import { OPEN_STATUS_FILTER } from '../../utils/constants';
import { Button, EmptyState, ErrorBanner, Spinner } from '../ui';
import { TaskFilters } from './TaskFilters';
import { TaskTable } from './TaskTable';

const PAGE_SIZE = 20;

/** Filters + table + pagination. Pass `projectId` to lock the list to one project. */
export function TaskListView({ projectId, emptyHint }) {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const sort = params.get('sort') ?? '-updatedAt';

  const { data: projects = [] } = useGetProjectsQuery();

  // Closed tasks are hidden unless asked for (via "Show closed" or the status filter).
  const status = params.get('status') || (params.get('closed') === 'true' ? undefined : OPEN_STATUS_FILTER);

  const { data, isLoading, isFetching, error, refetch } = useGetTasksQuery({
    q: params.get('q'),
    project: projectId ?? params.get('project'),
    status,
    priority: params.get('priority'),
    assignee: params.get('assignee'),
    overdue: params.get('overdue'),
    sort,
    page,
    limit: PAGE_SIZE,
  });

  const setParam = (key, value) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, String(value));
      return next;
    });

  const filtered = ['q', 'status', 'priority', 'assignee', 'overdue', 'project'].some((k) => params.get(k));

  return (
    <>
      <TaskFilters params={params} setParams={setParams} projects={projects} showProjectFilter={!projectId} />
      <ErrorBanner error={error && parseApiError(error)} onRetry={refetch} />
      {isLoading && <Spinner />}
      {data && (
        <p className="small muted list-count">
          {data.meta.total} task{data.meta.total === 1 ? '' : 's'}
          {status === OPEN_STATUS_FILTER && ' (closed tasks hidden)'}
        </p>
      )}
      {data && data.items.length === 0 && (
        <EmptyState title={filtered ? 'No tasks match these filters' : 'No tasks yet'}>{emptyHint}</EmptyState>
      )}
      {data && data.items.length > 0 && (
        <div className={isFetching ? 'refreshing' : ''}>
          <TaskTable
            tasks={data.items}
            sort={sort}
            showProject={!projectId}
            onSort={(s) => setParam('sort', s)}
          />
          {data.meta.totalPages > 1 && (
            <nav className="pager" aria-label="Pagination">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setParam('page', page - 1)}>Previous</Button>
              <span className="muted">Page {page} of {data.meta.totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setParam('page', page + 1)}>Next</Button>
            </nav>
          )}
        </div>
      )}
    </>
  );
}
