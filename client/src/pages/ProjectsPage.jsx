import { useState } from 'react';
import { Link } from 'react-router-dom';
import { parseApiError } from '../api/baseApi';
import { useGetProjectsQuery } from '../api/endpoints';
import { ProjectFormModal } from '../components/projects/ProjectFormModal';
import { projectPeople } from '../components/tasks/taskRules';
import { Button, EmptyState, ErrorBanner, PageHeader, Spinner } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

export function ProjectsPage() {
  const { isAdmin } = useAuth();
  const { data: projects = [], isLoading, error, refetch } = useGetProjectsQuery();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={isAdmin ? 'All current projects in the workspace.' : 'All current projects you’re part of, directly or through a team.'}
        actions={isAdmin && <Button onClick={() => setCreating(true)}>New project</Button>}
      />
      <ErrorBanner error={error && parseApiError(error)} onRetry={refetch} />
      {isLoading && <Spinner />}
      {!isLoading && !error && projects.length === 0 && (
        <EmptyState title="No projects yet">
          {isAdmin ? 'Create a project and add teams or people to it.' : 'You’ll see projects here once you’re added to one.'}
        </EmptyState>
      )}
      {projects.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Project</th>
                <th scope="col">Teams</th>
                <th scope="col">People</th>
                <th scope="col">Open tasks</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p._id}>
                  <td><Link to={`/projects/${p._id}`} className="task-key task-key--link">{p.key}</Link></td>
                  <td>
                    <Link to={`/projects/${p._id}`} className="table__title">{p.name}</Link>
                    {p.description && <div className="small muted">{p.description}</div>}
                  </td>
                  <td>{p.teams.length ? p.teams.map((t) => t.name).join(', ') : <span className="muted">—</span>}</td>
                  <td>{projectPeople(p).length}</td>
                  <td>{p.openCount} <span className="muted">of {p.taskCount}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && <ProjectFormModal open onClose={() => setCreating(false)} />}
    </>
  );
}
