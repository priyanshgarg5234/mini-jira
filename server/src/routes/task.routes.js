import { Router } from 'express';
import {
  addComment,
  createTask,
  getTask,
  getTaskActivity,
  listComments,
  listTasks,
  updateComment,
  updateTask,
} from '../controllers/task.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import {
  commentParams,
  commentSchema,
  createTaskSchema,
  listTasksQuery,
  updateTaskSchema,
} from '../validators/task.validator.js';

const router = Router();
router.use(authenticate);

// No DELETE anywhere: tasks are closed (status "closed"), comments are kept.
router
  .route('/')
  .get(validate({ query: listTasksQuery }), listTasks)
  .post(validate({ body: createTaskSchema }), createTask);

router
  .route('/:id')
  .get(validate({ params: idParam }), getTask)
  .patch(validate({ params: idParam, body: updateTaskSchema }), updateTask);

router.get('/:id/activity', validate({ params: idParam }), getTaskActivity);

router
  .route('/:id/comments')
  .get(validate({ params: idParam }), listComments)
  .post(validate({ params: idParam, body: commentSchema }), addComment);

router.patch('/:id/comments/:commentId', validate({ params: commentParams, body: commentSchema }), updateComment);

export default router;
