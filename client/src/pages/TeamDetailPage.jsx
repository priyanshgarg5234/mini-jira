import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { parseApiError } from '../api/baseApi';
import {
  useAddTeamMemberMutation,
  useDeleteTeamMutation,
  useGetTeamQuery,
  useGetUsersQuery,
  useRemoveTeamMemberMutation,
} from '../api/endpoints';
import { TeamFormModal } from '../components/teams/TeamFormModal';
import { Button, ConfirmModal, EmptyState, ErrorBanner, PageHeader, RoleBadge, Spinner, UserPicker } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export function TeamDetailPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useGetTeamQuery(teamId);
  const { data: users = [] } = useGetUsersQuery(undefined, { skip: !isAdmin });
  const [addMember] = useAddTeamMemberMutation();
  const [removeMember] = useRemoveTeamMemberMutation();
  const [deleteTeam, { isLoading: deleting }] = useDeleteTeamMutation();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removing, setRemoving] = useState(null);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner error={parseApiError(error)} />;

  const { team, projects } = data;
  const inTeam = new Set(team.members.map((m) => m._id));
  const candidates = users.filter((u) => !inTeam.has(u._id));

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

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb"><Link to="/teams">Teams</Link> / <span>{team.name}</span></nav>
      <PageHeader
        title={team.name}
        subtitle={team.description}
        actions={isAdmin && (
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}>Edit team</Button>
            <Button variant="danger-outline" onClick={() => setConfirmDelete(true)}>Delete team</Button>
          </>
        )}
      />

      <div className="two-col">
        <section className="panel">
          <header className="panel__head"><h2>Members ({team.members.length})</h2></header>
          {isAdmin && (
            <div className="add-row panel__body">
              <UserPicker
                people={candidates}
                value={null}
                placeholder="Type a name to add a member"
                onChange={(userId) => {
                  const name = candidates.find((c) => c._id === userId)?.name;
                  run(() => addMember({ id: team._id, userId }).unwrap(), `${name} added to the team`);
                }}
              />
            </div>
          )}
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                {isAdmin && <th scope="col"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {team.members.length === 0 && <tr><td colSpan={3} className="muted">No members yet.</td></tr>}
              {team.members.map((p) => (
                <tr key={p._id}>
                  <td>{p.name}<div className="small muted">{p.email}</div></td>
                  <td><RoleBadge role={p.role} /></td>
                  {isAdmin && (
                    <td className="actions">
                      <button type="button" className="btn btn--link text-danger" onClick={() => setRemoving(p)}>Remove</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <header className="panel__head"><h2>Projects ({projects.length})</h2></header>
          <div className="panel__body">
            {projects.length === 0 ? (
              <EmptyState title="Not on any project yet">{isAdmin ? 'Add this team from a project’s “Teams and people” tab.' : null}</EmptyState>
            ) : (
              <ul className="plain-list">
                {projects.map((p) => (
                  <li key={p._id}>
                    <span className="task-key">{p.key}</span> <Link to={`/projects/${p._id}`}>{p.name}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {editing && <TeamFormModal open team={team} onClose={() => setEditing(false)} />}
      <ConfirmModal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.name}?`}
        message="If they aren't part of this team's projects in another way, their open tasks there become unassigned."
        confirmLabel="Remove member"
        onConfirm={async () => {
          await run(
            () => removeMember({ id: team._id, userId: removing._id }).unwrap(),
            (res) => `${removing.name} removed${res.unassignedTasks ? `; ${res.unassignedTasks} task(s) unassigned` : ''}`
          );
          setRemoving(null);
        }}
      />
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${team.name}?`}
        message="A team can only be deleted once it isn't on any project."
        confirmLabel="Delete team"
        loading={deleting}
        onConfirm={async () => {
          if (await run(() => deleteTeam(team._id).unwrap(), 'Team deleted')) navigate('/teams');
          else setConfirmDelete(false);
        }}
      />
    </>
  );
}
