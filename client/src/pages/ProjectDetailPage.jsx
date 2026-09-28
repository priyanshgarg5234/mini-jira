import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { parseApiError } from '../api/baseApi';
import {
  useAddProjectMemberMutation,
  useAddProjectTeamMutation,
  useDeleteProjectMutation,
  useGetProjectQuery,
  useGetTeamsQuery,
  useGetUsersQuery,
  useRemoveProjectMemberMutation,
  useRemoveProjectTeamMutation,
} from '../api/endpoints';
import { ProjectFormModal } from '../components/projects/ProjectFormModal';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { TaskListView } from '../components/tasks/TaskListView';
import { Button, ConfirmModal, ErrorBanner, PageHeader, RoleBadge, Spinner, UserPicker } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'people' ? 'people' : 'tasks';
  const { isAdmin } = useAuth();
  const { data: project, isLoading, error } = useGetProjectQuery(projectId);
  const canManage = isAdmin;
  const { data: teams = [] } = useGetTeamsQuery(undefined, { skip: !canManage });
  const { data: users = [] } = useGetUsersQuery(undefined, { skip: !canManage });
  const [addTeam] = useAddProjectTeamMutation();
  const [removeTeam] = useRemoveProjectTeamMutation();
  const [addMember] = useAddProjectMemberMutation();
  const [removeMember] = useRemoveProjectMemberMutation();
  const [deleteProject, { isLoading: deleting }] = useDeleteProjectMutation();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [teamToAdd, setTeamToAdd] = useState('');

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner error={parseApiError(error)} />;

  const run = async (fn, message) => {
    try {
      const res = await fn();
      toast.success(typeof message === 'function' ? message(res) : message);
      return true;
    } catch (err) {
      toast.error(parseApiError(err).message);
      return false;
    }
  };
  const unassignedNote = (res) => (res?.unassignedTasks ? ` ${res.unassignedTasks} task(s) are now unassigned.` : '');

  const teamIds = new Set(project.teams.map((t) => t._id));
  const memberIds = new Set(project.members.map((m) => m._id));
  const teamCandidates = teams.filter((t) => !teamIds.has(t._id));
  const personCandidates = users.filter((u) => u.isActive && !memberIds.has(u._id));
  const switchTab = (t) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (t === 'people') next.set('tab', 'people');
      else next.delete('tab');
      return next;
    });

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb"><Link to="/projects">Projects</Link> / <span>{project.name}</span></nav>
      <PageHeader
        title={<><span className="project-key">{project.key}</span> {project.name}</>}
        subtitle={project.description || `Created by ${project.createdBy?.name ?? 'an admin'}`}
        actions={
          <>
            {canManage && <Button variant="secondary" onClick={() => setEditing(true)}>Edit project</Button>}
            {canManage && project.taskCount === 0 && (
              <Button variant="danger-outline" onClick={() => setConfirmDelete(true)}>Delete project</Button>
            )}
            <Button onClick={() => setCreating(true)}>New task</Button>
          </>
        }
      />

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'tasks'} onClick={() => switchTab('tasks')}>
          Tasks ({project.openCount} open)
        </button>
        <button type="button" role="tab" aria-selected={tab === 'people'} onClick={() => switchTab('people')}>
          Teams and people
        </button>
      </div>

      {tab === 'tasks' ? (
        <TaskListView projectId={project._id} emptyHint="Create the first task for this project." />
      ) : (
        <div className="two-col">
          <section className="panel">
            <header className="panel__head"><h2>Teams ({project.teams.length})</h2></header>
            {canManage && (
              <form className="add-row panel__body" onSubmit={async (e) => {
                e.preventDefault();
                const name = teams.find((t) => t._id === teamToAdd)?.name;
                if (teamToAdd && (await run(() => addTeam({ id: project._id, teamId: teamToAdd }).unwrap(), `${name} added to the project`))) setTeamToAdd('');
              }}>
                <select className="input" aria-label="Team to add" value={teamToAdd} onChange={(e) => setTeamToAdd(e.target.value)}>
                  <option value="">{teamCandidates.length ? 'Select a team to add' : 'All teams are already on this project'}</option>
                  {teamCandidates.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
                <Button type="submit" disabled={!teamToAdd}>Add team</Button>
              </form>
            )}
            <table className="table">
              <thead><tr><th scope="col">Team</th><th scope="col">People</th>{canManage && <th />}</tr></thead>
              <tbody>
                {project.teams.length === 0 && <tr><td colSpan={3} className="muted">No teams. People below were added individually.</td></tr>}
                {project.teams.map((t) => (
                  <tr key={t._id}>
                    <td><Link to={`/teams/${t._id}`} className="table__title">{t.name}</Link></td>
                    <td>{t.members.length}</td>
                    {canManage && (
                      <td className="actions">
                        <button type="button" className="btn btn--link text-danger"
                          onClick={() => run(() => removeTeam({ id: project._id, teamId: t._id }).unwrap(), (res) => `${t.name} removed.${unassignedNote(res)}`)}>
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <header className="panel__head"><h2>People added directly ({project.members.length})</h2></header>
            <p className="panel__body small muted panel__intro">
              For people who aren’t in any of the teams above. Everyone in those teams is already on the project.
            </p>
            {canManage && (
              <div className="add-row panel__body">
                <UserPicker
                  people={personCandidates}
                  value={null}
                  placeholder="Type a name to add someone"
                  onChange={(userId) => {
                    const name = users.find((u) => u._id === userId)?.name;
                    run(() => addMember({ id: project._id, userId }).unwrap(), `${name} added to the project`);
                  }}
                />
              </div>
            )}
            <table className="table">
              <thead><tr><th scope="col">Name</th><th scope="col">Role</th>{canManage && <th />}</tr></thead>
              <tbody>
                {project.members.length === 0 && (
                  <tr><td colSpan={3} className="muted">No one added directly.</td></tr>
                )}
                {project.members.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}<div className="small muted">{u.email}</div></td>
                    <td><RoleBadge role={u.role} /></td>
                    {canManage && (
                      <td className="actions">
                        <button type="button" className="btn btn--link text-danger"
                          onClick={() => run(() => removeMember({ id: project._id, userId: u._id }).unwrap(), (res) => `${u.name} removed.${unassignedNote(res)}`)}>
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {creating && <CreateTaskModal open projectId={project._id} onClose={() => setCreating(false)} />}
      {editing && <ProjectFormModal open project={project} onClose={() => setEditing(false)} />}
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${project.name}?`}
        message="Only projects without tasks can be deleted. This can’t be undone."
        confirmLabel="Delete project"
        loading={deleting}
        onConfirm={async () => {
          if (await run(() => deleteProject(project._id).unwrap(), 'Project deleted')) navigate('/projects');
          else setConfirmDelete(false);
        }}
      />
    </>
  );
}
