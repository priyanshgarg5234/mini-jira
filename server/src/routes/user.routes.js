import { Router } from 'express';
import { ROLES } from '../config/constants.js';
import { createUser, getUser, listUsers, updateUser } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import { createUserSchema, listUsersQuery, updateUserSchema } from '../validators/user.validator.js';

const router = Router();
router.use(authenticate, authorize(ROLES.ADMIN));

// Admin only. There is no DELETE: deactivate with PATCH { isActive: false }.
router.route('/').get(validate({ query: listUsersQuery }), listUsers).post(validate({ body: createUserSchema }), createUser);
router
  .route('/:id')
  .get(validate({ params: idParam }), getUser)
  .patch(validate({ params: idParam, body: updateUserSchema }), updateUser);

export default router;
