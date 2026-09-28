import { useMemo, useState } from 'react';
import { parseApiError } from '../../api/baseApi';
import { useCreateTaskMutation, useGetProjectsQuery } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { PRIORITIES, STATUSES } from '../../utils/constants';
import { Button, Input, Modal, Select, Textarea, UserPicker } from '../ui';
import { projectPeople, validateTask } from './taskRules';

const EMPTY = { title: '', description: '', priority: '', status: 'todo', assignee: '', dueDate: '' };
const OPEN_STATUSES = STATUSES.filter((s) => s.value !== 'closed');

/** New task. Editing happens on the task page itself. */
export function CreateTaskModal({ open, onClose, projectId }) {
  const toast = useToast();
  const { data: projects = [] } = useGetProjectsQuery();
  const [createTask, { isLoading }] = useCreateTaskMutation();
  const [values, setValues] = useState({ ...EMPTY, project: projectId ?? '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const project = projects.find((p) => p._id === values.project);
  const people = useMemo(() => projectPeople(project), [project]);
  const { minDueDate } = validateTask(values, null);

  const set = (field) => (e) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [field]: value, ...(field === 'project' ? { assignee: '' } : {}) }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const { errors: found } = validateTask(values, null);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;
    try {
      const created = await createTask({
        project: values.project,
        title: values.title.trim(),
        description: values.description.trim(),
        priority: values.priority,
        status: values.status,
        assignee: values.assignee || null,
        dueDate: values.dueDate || null,
      }).unwrap();
      toast.success(`${created.key} created`);
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors(parsed.fields);
      setFormError(parsed.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New task"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="task-form" loading={isLoading}>Create task</Button>
        </>
      }
    >
      <form id="task-form" className="grid-2" onSubmit={submit} noValidate>
        {formError && <div className="alert alert--error span-2" role="alert">{formError}</div>}
        <Select
          label="Project"
          required
          className="span-2"
          value={values.project}
          onChange={set('project')}
          error={errors.project}
          disabled={Boolean(projectId)}
          placeholder="Select a project"
          options={projects.map((p) => ({ value: p._id, label: `${p.key} – ${p.name}` }))}
        />
        <Input label="Title" required className="span-2" value={values.title} onChange={set('title')} error={errors.title} maxLength={200} />
        <Textarea label="Description" className="span-2" rows={4} value={values.description} onChange={set('description')} />
        <Select label="Priority" required value={values.priority} onChange={set('priority')} error={errors.priority} placeholder="Select priority" options={PRIORITIES} />
        <Select label="Status" value={values.status} onChange={set('status')} options={OPEN_STATUSES} />
        <UserPicker
          label="Assignee"
          people={people}
          value={values.assignee}
          allowClear
          disabled={!values.project}
          placeholder={values.project ? 'Type a name or email' : 'Select a project first'}
          error={errors.assignee}
          hint={values.project ? `${people.length} people on this project` : undefined}
          onChange={(userId) => {
            setValues((v) => ({ ...v, assignee: userId ?? '' }));
            setErrors((er) => ({ ...er, assignee: undefined }));
          }}
        />
        <Input label="Due date" type="date" min={minDueDate} value={values.dueDate} onChange={set('dueDate')} error={errors.dueDate}
          hint="Can't be before today or the assigned date" />
      </form>
    </Modal>
  );
}
