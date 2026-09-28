import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseApiError } from '../../api/baseApi';
import { useCreateProjectMutation, useGetTeamsQuery, useGetUsersQuery, useUpdateProjectMutation } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { Button, CheckboxList, Input, Modal, Textarea } from '../ui';

const suggestKey = (name) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);

/** Create a project (with teams and people) or edit its details (pass `project`). */
export function ProjectFormModal({ open, onClose, project }) {
  const toast = useToast();
  const navigate = useNavigate();
  const isEdit = Boolean(project);
  const { data: teams = [] } = useGetTeamsQuery(undefined, { skip: isEdit });
  const { data: users = [] } = useGetUsersQuery(undefined, { skip: isEdit });
  const [create, createState] = useCreateProjectMutation();
  const [update, updateState] = useUpdateProjectMutation();
  const [values, setValues] = useState({
    name: project?.name ?? '',
    key: project?.key ?? '',
    description: project?.description ?? '',
    teams: [],
    members: [],
  });
  const [keyTouched, setKeyTouched] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const set = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    const name = values.name.trim();
    if (name.length < 2) found.name = name ? 'Name must be at least 2 characters' : 'Name is required';
    if (!isEdit && !/^[A-Z][A-Z0-9]{1,9}$/.test(values.key)) found.key = 'Use 2–10 letters or numbers, starting with a letter';
    if (!isEdit && values.teams.length + values.members.length === 0) found.teams = 'Add at least one team or person';
    setErrors(found);
    if (Object.keys(found).length) return;

    try {
      if (isEdit) {
        await update({ id: project._id, name, description: values.description.trim() }).unwrap();
        toast.success('Project saved');
        onClose();
      } else {
        const p = await create({ ...values, name, description: values.description.trim() }).unwrap();
        toast.success(`Project ${p.key} created`);
        onClose();
        navigate(`/projects/${p._id}`);
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
      size="lg"
      title={isEdit ? `Edit ${project.key}` : 'New project'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="project-form" loading={createState.isLoading || updateState.isLoading}>
            {isEdit ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <form id="project-form" className="grid-2" onSubmit={submit} noValidate>
        {errors.form && <div className="alert alert--error span-2" role="alert">{errors.form}</div>}
        <Input label="Name" required value={values.name} error={errors.name}
          onChange={(e) => {
            const name = e.target.value;
            setValues((v) => ({ ...v, name, key: keyTouched ? v.key : suggestKey(name) }));
            setErrors((er) => ({ ...er, name: undefined }));
          }} />
        <Input label="Key" required value={values.key} error={errors.key} disabled={isEdit} maxLength={10}
          hint={isEdit ? 'The key can’t change once tasks exist' : 'Prefix for task numbers, e.g. WEB-12'}
          onChange={(e) => { setKeyTouched(true); set('key', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); }} />
        <Textarea label="Description" className="span-2" rows={3} value={values.description} onChange={(e) => set('description', e.target.value)} />
        {!isEdit && (
          <>
            <CheckboxList
              label="Teams"
              value={values.teams}
              error={errors.teams}
              onChange={(v) => set('teams', v)}
              options={teams.map((t) => ({ value: t._id, label: t.name, hint: `${t.members.length} people` }))}
              emptyText="No teams yet"
              hint="Everyone in these teams can work on the project"
            />
            <CheckboxList
              label="Individual people"
              value={values.members}
              onChange={(v) => set('members', v)}
              options={users.filter((u) => u.isActive).map((u) => ({ value: u._id, label: u.name, hint: u.role }))}
              hint="Add people who aren’t in a selected team"
            />
          </>
        )}
      </form>
    </Modal>
  );
}
