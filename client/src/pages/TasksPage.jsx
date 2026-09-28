import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetProjectsQuery } from '../api/endpoints';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { TaskListView } from '../components/tasks/TaskListView';
import { Button, PageHeader } from '../components/ui';

export function TasksPage() {
  const [params] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const { data: projects = [] } = useGetProjectsQuery();

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="All tasks across your projects. Click a key to open and edit a task."
        actions={
          <Button onClick={() => setCreating(true)} disabled={!projects.length} title={projects.length ? undefined : 'You need to be part of a project first'}>
            New task
          </Button>
        }
      />
      <TaskListView emptyHint={projects.length ? 'Create a task or change the filters.' : 'Ask an admin to add you to a project or team.'} />
      {creating && <CreateTaskModal open projectId={params.get('project') || undefined} onClose={() => setCreating(false)} />}
    </>
  );
}
