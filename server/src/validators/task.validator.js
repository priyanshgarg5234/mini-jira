import { z } from 'zod';
import { TASK_PRIORITY, TASK_STATUS } from '../config/constants.js';
import { objectId, requiredText } from './common.js';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), 'Not a real date');

const enumField = (values, label, invalidMessage) =>
  z.enum(values, {
    errorMap: (issue, ctx) => ({
      message: issue.code === 'invalid_type' && ctx.data === undefined ? `${label} is required` : invalidMessage,
    }),
  });

const priority = enumField(TASK_PRIORITY, 'Priority', 'Priority must be low, medium or high');
const status = enumField(TASK_STATUS, 'Status', 'Status must be todo, in_progress, in_review, done or closed');

export const createTaskSchema = z.object({
  project: objectId,
  title: requiredText('Title', 3, 200),
  description: z.string().trim().max(10000).optional().default(''),
  priority,
  status: status.optional().default('todo'),
  assignee: objectId.nullable().optional().default(null),
  dueDate: isoDate.nullable().optional().default(null),
});

export const updateTaskSchema = z
  .object({
    title: requiredText('Title', 3, 200).optional(),
    description: z.string().trim().max(10000).optional(),
    priority: priority.optional(),
    status: status.optional(),
    assignee: objectId.nullable().optional(),
    dueDate: isoDate.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

const csvOf = (values) =>
  z
    .string()
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(z.enum(values)));

export const listTasksQuery = z.object({
  project: objectId.optional(),
  q: z.string().trim().max(100).optional(),
  status: csvOf(TASK_STATUS).optional(),
  priority: csvOf(TASK_PRIORITY).optional(),
  assignee: z.union([objectId, z.literal('me'), z.literal('unassigned')]).optional(),
  overdue: z.enum(['true', 'false']).optional(),
  sort: z
    .enum(['updatedAt', '-updatedAt', 'createdAt', '-createdAt', 'priority', '-priority', 'dueDate', '-dueDate'])
    .optional()
    .default('-updatedAt'),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const commentSchema = z.object({
  body: requiredText('Comment', 1, 5000),
});

export const commentParams = z.object({ id: objectId, commentId: objectId });
