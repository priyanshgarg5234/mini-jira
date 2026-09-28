import { Router } from 'express';
import { ROLES } from '../config/constants.js';
import {
  addMember,
  addTeam,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  removeMember,
  removeTeam,
  updateProject,
} from '../controllers/project.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import {
  createProjectSchema,
  memberBody,
  memberParams,
  teamBody,
  teamParams,
  updateProjectSchema,
} from '../validators/project.validator.js';

const router = Router();
router.use(authenticate);
const adminOnly = authorize(ROLES.ADMIN); // only admins create or change teams and projects

router
  .route('/')
  .get(listProjects)
  .post(adminOnly, validate({ body: createProjectSchema }), createProject);

router
  .route('/:id')
  .get(validate({ params: idParam }), getProject)
  .patch(adminOnly, validate({ params: idParam, body: updateProjectSchema }), updateProject)
  .delete(adminOnly, validate({ params: idParam }), deleteProject);

router.post('/:id/teams', adminOnly, validate({ params: idParam, body: teamBody }), addTeam);
router.delete('/:id/teams/:teamId', adminOnly, validate({ params: teamParams }), removeTeam);
router.post('/:id/members', adminOnly, validate({ params: idParam, body: memberBody }), addMember);
router.delete('/:id/members/:userId', adminOnly, validate({ params: memberParams }), removeMember);

export default router;
