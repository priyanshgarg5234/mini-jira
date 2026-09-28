import { Activity, User } from '../models/index.js';
import { dueDateToISO } from '../utils/dates.js';

const TRACKED = ['title', 'description', 'status', 'priority', 'assignee', 'dueDate'];

const norm = (field, v) => {
  if (v == null || v === '') return null;
  if (field === 'dueDate') return typeof v === 'string' ? v : dueDateToISO(v);
  if (typeof v === 'object' && v._id) return String(v._id);
  return String(v);
};

/** [{ field, from, to }] for fields that really changed. Long text is recorded as "changed" only. */
export function diffTask(before, updates) {
  return TRACKED.filter((f) => f in updates && norm(f, before[f]) !== norm(f, updates[f])).map((f) => ({
    field: f,
    from: f === 'description' ? null : norm(f, before[f]),
    to: f === 'description' ? null : norm(f, updates[f]),
  }));
}

export const logActivity = (task, actor, action, changes = []) =>
  Activity.create({ task: task._id, actor: actor._id, action, changes });

/** History for a task with assignee ids turned into names. */
export async function taskHistory(taskId) {
  const items = await Activity.find({ task: taskId }).sort({ createdAt: -1 }).limit(200).populate('actor', 'name').lean();
  const ids = items.flatMap((a) => a.changes.filter((c) => c.field === 'assignee').flatMap((c) => [c.from, c.to])).filter(Boolean);
  const names = new Map((await User.find({ _id: { $in: ids } }, 'name').lean()).map((u) => [String(u._id), u.name]));
  for (const a of items) {
    for (const c of a.changes) {
      if (c.field === 'assignee') {
        c.from = c.from ? names.get(c.from) ?? 'Unknown user' : null;
        c.to = c.to ? names.get(c.to) ?? 'Unknown user' : null;
      }
    }
  }
  return items;
}
