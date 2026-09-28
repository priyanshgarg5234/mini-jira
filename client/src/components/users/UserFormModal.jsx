import { useState } from 'react';
import { parseApiError } from '../../api/baseApi';
import { useCreateUserMutation, useUpdateUserMutation } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { ROLES } from '../../utils/constants';
import { Button, Input, Modal, Select } from '../ui';

export const passwordProblem = (pw) => {
  if (pw.length < 8) return 'Use at least 8 characters';
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) return 'Include an uppercase letter, a lowercase letter and a number';
  return null;
};

export function UserFormModal({ open, onClose, user }) {
  const toast = useToast();
  const isEdit = Boolean(user);
  const [create, createState] = useCreateUserMutation();
  const [update, updateState] = useUpdateUserMutation();
  const [values, setValues] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'user',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (values.name.trim().length < 2) found.name = values.name.trim() ? 'Name must be at least 2 characters' : 'Name is required';
    if (!values.email.trim()) found.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(values.email)) found.email = 'Enter a valid email address';
    if (!isEdit && !values.password) found.password = 'Password is required';
    else if (values.password) found.password = passwordProblem(values.password) ?? undefined;
    Object.keys(found).forEach((k) => found[k] === undefined && delete found[k]);
    setErrors(found);
    if (Object.keys(found).length) return;

    const body = { name: values.name.trim(), email: values.email.trim(), role: values.role };
    if (values.password) body.password = values.password;
    try {
      if (isEdit) {
        await update({ id: user._id, ...body }).unwrap();
        toast.success(`${body.name} saved`);
      } else {
        await create(body).unwrap();
        toast.success(`${body.name} added. Share the temporary password with them securely.`);
      }
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors({ ...parsed.fields, form: parsed.message });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${user.name}` : 'Add user'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="user-form" loading={createState.isLoading || updateState.isLoading}>
            {isEdit ? 'Save changes' : 'Add user'}
          </Button>
        </>
      }
    >
      <form id="user-form" className="stack" onSubmit={submit} noValidate>
        {errors.form && <div className="alert alert--error" role="alert">{errors.form}</div>}
        <Input label="Full name" required value={values.name} error={errors.name} onChange={set('name')} autoComplete="off" />
        <Input label="Email" required type="email" value={values.email} error={errors.email} onChange={set('email')} autoComplete="off" />
        <Select label="Role" required value={values.role} error={errors.role} options={ROLES} onChange={set('role')}
          hint="Admins manage users, teams and projects. Users work on tasks." />
        <Input
          label={isEdit ? 'New password' : 'Temporary password'}
          required={!isEdit}
          type="password"
          autoComplete="new-password"
          value={values.password}
          error={errors.password}
          onChange={set('password')}
          hint={isEdit ? 'Leave empty to keep the current password. Setting one signs them out everywhere.' : '8+ characters with upper and lower case letters and a number'}
        />
      </form>
    </Modal>
  );
}
