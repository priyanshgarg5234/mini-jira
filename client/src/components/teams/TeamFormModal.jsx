import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseApiError } from '../../api/baseApi';
import { useCreateTeamMutation, useUpdateTeamMutation } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { Button, Input, Modal, Textarea } from '../ui';

export function TeamFormModal({ open, onClose, team }) {
  const toast = useToast();
  const navigate = useNavigate();
  const isEdit = Boolean(team);
  const [create, createState] = useCreateTeamMutation();
  const [update, updateState] = useUpdateTeamMutation();
  const [values, setValues] = useState({ name: team?.name ?? '', description: team?.description ?? '' });
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    const name = values.name.trim();
    if (name.length < 2) return setErrors({ name: name ? 'Team name must be at least 2 characters' : 'Team name is required' });
    const body = { name, description: values.description.trim() };
    try {
      if (isEdit) {
        await update({ id: team._id, ...body }).unwrap();
        toast.success('Team saved');
        onClose();
      } else {
        const created = await create(body).unwrap();
        toast.success(`Team ${created.name} created. Add members next.`);
        onClose();
        navigate(`/teams/${created._id}`);
      }
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors({ ...parsed.fields, form: parsed.message });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit team' : 'New team'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="team-form" loading={createState.isLoading || updateState.isLoading}>
            {isEdit ? 'Save changes' : 'Create team'}
          </Button>
        </>
      }
    >
      <form id="team-form" className="stack" onSubmit={submit} noValidate>
        {errors.form && <div className="alert alert--error" role="alert">{errors.form}</div>}
        <Input label="Team name" required value={values.name} error={errors.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
        <Textarea label="Description" rows={3} value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} />
      </form>
    </Modal>
  );
}
