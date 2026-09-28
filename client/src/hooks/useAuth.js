import { useSelector } from 'react-redux';

const idOf = (v) => (v?._id ?? v ?? null);

export function useAuth() {
  const user = useSelector((s) => s.auth.user);
  const isAdmin = user?.role === 'admin';
  return {
    user,
    isAdmin,
    /** Mirrors the server rules so the UI only offers allowed actions. */
    taskPermissions: (task) => {
      const assigneeId = idOf(task.assignee);
      const open = task.status !== 'closed';
      return { canEdit: open, canReassign: open && (isAdmin || !assigneeId || assigneeId === user?._id) };
    },
  };
}
