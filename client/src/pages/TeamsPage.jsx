import { useState } from 'react';
import { Link } from 'react-router-dom';
import { parseApiError } from '../api/baseApi';
import { useGetTeamsQuery } from '../api/endpoints';
import { TeamFormModal } from '../components/teams/TeamFormModal';
import { Button, EmptyState, ErrorBanner, PageHeader, Spinner } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

export function TeamsPage() {
  const { isAdmin } = useAuth();
  const { data: teams = [], isLoading, error, refetch } = useGetTeamsQuery();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Teams"
        subtitle="Click a team to see its members. People can be in several teams, and a team can work on several projects."
        actions={isAdmin && <Button onClick={() => setCreating(true)}>New team</Button>}
      />
      <ErrorBanner error={error && parseApiError(error)} onRetry={refetch} />
      {isLoading && <Spinner />}
      {!isLoading && !error && teams.length === 0 && (
        <EmptyState title="No teams yet">
          {isAdmin ? 'Create a team and add members to it.' : 'You haven’t been added to a team yet.'}
        </EmptyState>
      )}
      {teams.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Team</th>
                <th scope="col">Members</th>
                <th scope="col">Projects</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t._id}>
                  <td>
                    <Link to={`/teams/${t._id}`} className="table__title">{t.name}</Link>
                    {t.description && <div className="small muted">{t.description}</div>}
                  </td>
                  <td>{t.members.length}</td>
                  <td>{t.projectCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && <TeamFormModal open onClose={() => setCreating(false)} />}
    </>
  );
}
