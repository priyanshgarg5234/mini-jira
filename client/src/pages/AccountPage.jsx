import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { parseApiError } from '../api/baseApi';
import { useChangePasswordMutation, useLogoutAllMutation } from '../api/endpoints';
import { passwordProblem } from '../components/users/UserFormModal';
import { Button, Input, PageHeader, RoleBadge } from '../components/ui';
import { setCredentials } from '../features/auth/authSlice';
import { signOut } from '../features/auth/signOut';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

export function AccountPage() {
  const dispatch = useDispatch();
  const toast = useToast();
  const { user } = useAuth();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [logoutAll, { isLoading: signingOut }] = useLogoutAllMutation();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!values.currentPassword) found.currentPassword = 'Current password is required';
    const problem = values.newPassword ? passwordProblem(values.newPassword) : 'New password is required';
    if (problem) found.newPassword = problem;
    if (values.confirm !== values.newPassword) found.confirm = 'Passwords don’t match';
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      const session = await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }).unwrap();
      dispatch(setCredentials(session));
      setValues(EMPTY);
      toast.success('Password changed. Other devices have been signed out.');
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors({ ...parsed.fields, form: parsed.fields.currentPassword ? undefined : parsed.message });
    }
  };

  return (
    <>
      <PageHeader title="Account" subtitle={<>{user.name} · {user.email} · <RoleBadge role={user.role} /></>} />
      <div className="two-col">
        <section className="panel">
          <header className="panel__head"><h2>Change password</h2></header>
          <form className="stack panel__body" onSubmit={submit} noValidate>
            {errors.form && <div className="alert alert--error" role="alert">{errors.form}</div>}
            <Input label="Current password" type="password" required autoComplete="current-password" value={values.currentPassword} error={errors.currentPassword} onChange={set('currentPassword')} />
            <Input label="New password" type="password" required autoComplete="new-password" value={values.newPassword} error={errors.newPassword} onChange={set('newPassword')} hint="8+ characters with upper and lower case letters and a number" />
            <Input label="Confirm new password" type="password" required autoComplete="new-password" value={values.confirm} error={errors.confirm} onChange={set('confirm')} />
            <div><Button type="submit" loading={isLoading}>Change password</Button></div>
          </form>
        </section>
        <section className="panel">
          <header className="panel__head"><h2>Sessions</h2></header>
          <div className="stack panel__body">
            <p className="muted">Lost a device or signed in on a shared computer? Sign out everywhere, including here.</p>
            <div>
              <Button
                variant="danger-outline"
                loading={signingOut}
                onClick={async () => {
                  try {
                    await logoutAll().unwrap();
                  } finally {
                    dispatch(signOut());
                  }
                }}
              >
                Sign out of all devices
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
