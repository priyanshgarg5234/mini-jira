import { FINISHED_STATUSES } from '../config/constants.js';
import { Project, Task, Team, User } from '../models/index.js';
import {
  PROJECT_POPULATE,
  getProjectForUser,
  unassignNonParticipants,
  visibleProjectsFilter,
} from '../services/access.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

async function taskCounts(projectIds) {
  const rows = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $group: {
        _id: '$project',
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $in: ['$status', FINISHED_STATUSES] }, 0, 1] } },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
}

const withCounts = (project, counts) => ({
  ...project,
  taskCount: counts.get(String(project._id))?.total ?? 0,
  openCount: counts.get(String(project._id))?.open ?? 0,
});

export const listProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find(await visibleProjectsFilter(req.user))
    .populate(PROJECT_POPULATE)
    .sort({ name: 1 })
    .lean();
  const counts = await taskCounts(projects.map((p) => p._id));
  res.json({ items: projects.map((p) => withCounts(p, counts)) });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user);
  const counts = await taskCounts([project._id]);
  res.json({ project: withCounts(project.toJSON(), counts) });
});

export const createProject = asyncHandler(async (req, res) => {
  const { teams, members, ...rest } = req.body;
  const [validTeams, validMembers] = await Promise.all([
    Team.find({ _id: { $in: teams } }).distinct('_id'),
    User.find({ _id: { $in: members }, isActive: true }).distinct('_id'),
  ]);
  if (validTeams.length !== teams.length) throw ApiError.field('teams', 'One or more teams no longer exist');

  const project = await Project.create({ ...rest, teams: validTeams, members: validMembers, createdBy: req.user._id });
  await project.populate(PROJECT_POPULATE);
  req.log.info({ projectId: String(project._id), key: project.key }, 'Project created');
  res.status(201).json({ project });
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user);
  Object.assign(project, req.body);
  await project.save();
  res.json({ project: await reload(project._id) });
});

/** Tasks are never deleted, so only an empty project can be deleted. Admin only (see routes). */
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user);
  const taskCount = await Task.countDocuments({ project: project._id });
  if (taskCount) {
    throw ApiError.conflict(`This project has ${taskCount} task(s). Projects with tasks can't be deleted.`);
  }
  await project.deleteOne();
  req.log.info({ projectId: String(project._id) }, 'Project deleted');
  res.status(204).end();
});

// ---- staffing ----

async function reload(projectId) {
  return Project.findById(projectId).populate(PROJECT_POPULATE);
}

export const addTeam = asyncHandler(async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user);
  const team = await Team.findById(req.body.teamId);
  if (!team) throw ApiError.field('teamId', 'Team not found');
  await Project.updateOne({ _id: project._id }, { $addToSet: { teams: team._id } });
  req.log.info({ projectId: String(project._id), teamId: String(team._id) }, 'Team added to project');
  res.json({ project: await reload(project._id) });
});

export const removeTeam = asyncHandler(async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user);
  await Project.updateOne({ _id: project._id }, { $pull: { teams: req.params.teamId } });
  const unassignedTasks = await unassignNonParticipants([project._id]);
  req.log.info({ projectId: String(project._id), teamId: req.params.teamId, unassignedTasks }, 'Team removed from project');
  res.json({ project: await reload(project._id), unassignedTasks });
});

export const addMember = asyncHandler(async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user);
  const user = await User.findOne({ _id: req.body.userId, isActive: true });
  if (!user) throw ApiError.field('userId', 'User not found or deactivated');
  await Project.updateOne({ _id: project._id }, { $addToSet: { members: user._id } });
  res.json({ project: await reload(project._id) });
});

export const removeMember = asyncHandler(async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user);
  await Project.updateOne({ _id: project._id }, { $pull: { members: req.params.userId } });
  // They may still take part through a team; only unassign if they're fully out.
  const unassignedTasks = await unassignNonParticipants([project._id]);
  res.json({ project: await reload(project._id), unassignedTasks });
});
