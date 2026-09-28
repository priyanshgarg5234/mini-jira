import { Router } from 'express';
import { ROLES } from '../config/constants.js';
import {
  addMember,
  createTeam,
  deleteTeam,
  getTeam,
  listTeams,
  removeMember,
  updateTeam,
} from '../controllers/team.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import { createTeamSchema, memberBody, memberParams, updateTeamSchema } from '../validators/team.validator.js';

const router = Router();
router.use(authenticate);
const adminOnly = authorize(ROLES.ADMIN); // only admins create or change teams and projects

router
  .route('/')
  .get(listTeams)
  .post(adminOnly, validate({ body: createTeamSchema }), createTeam);

router
  .route('/:id')
  .get(validate({ params: idParam }), getTeam)
  .patch(adminOnly, validate({ params: idParam, body: updateTeamSchema }), updateTeam)
  .delete(adminOnly, validate({ params: idParam }), deleteTeam);

router.post('/:id/members', adminOnly, validate({ params: idParam, body: memberBody }), addMember);
router.delete('/:id/members/:userId', adminOnly, validate({ params: memberParams }), removeMember);

export default router;
