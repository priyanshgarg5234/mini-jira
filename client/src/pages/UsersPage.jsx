import { useState } from 'react';
import { parseApiError } from '../api/baseApi';
import { useGetUsersQuery, useUpdateUserMutation } from '../api/endpoints';
import { UserFormModal } from '../components/users/UserFormModal';
import { Button, ConfirmModal, EmptyState, ErrorBanner, PageHeader, RoleBadge, Spinner } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../utils/dates';

/** Active users only. Deleted users are deactivated in the database and never shown. */
export function UsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const debounced = useDebounce(q);
  const { data: users = [], isLoading, error, refetch } = useGetUsersQuery({ q: debounced });
  const [updateUser, { isLoading: deleting }] = useUpdateUserMutation();
  const [modal, setModal] = useState(null);
  const [removing, setRemoving] = useState(null);

  const remove = async (u) => {
    try {
      const res = await updateUser({ id: u._id, isActive: false }).unwrap();
      toast.success(`${u.name} deleted${res.unassignedTasks ? `; ${res.unassignedTasks} open task(s) unassigned` : ''}`);
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  return (
    <>
      <PageHeader title="Users" subtitle="Add, edit and delete the people who can sign in." actions={<Button onClick={() => setModal({})}>Add user</Button>} />
      <div className="filters">
        <input type="search" className="input filters__search" placeholder="Search name or email" aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ErrorBanner error={error && parseApiError(error)} onRetry={refetch} />
      {isLoading && <Spinner />}
      {!isLoading && users.length === 0 && <EmptyState title="No users found" />}
      {users.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Added</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}{u._id === me._id && <span className="muted"> (you)</span>}</td>
                  <td>{u.email}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td className="muted nowrap">{formatDate(u.createdAt)}</td>
                  <td className="nowrap actions">
                    <button type="button" className="btn btn--link" onClick={() => setModal({ user: u })}>Edit</button>
                    {u._id !== me._id && (
                      <button type="button" className="btn btn--link text-danger" onClick={() => setRemoving(u)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <UserFormModal open user={modal.user} onClose={() => setModal(null)} />}
      <ConfirmModal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={`Delete ${removing?.name}?`}
        message="They will be signed out, won’t be able to sign in, and will no longer appear in the app. Their open tasks become unassigned. Past tasks and comments keep their name."
        confirmLabel="Delete user"
        loading={deleting}
        onConfirm={async () => {
          await remove(removing);
          setRemoving(null);
        }}
      />
    </>
  );
}
