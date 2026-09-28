import { Project, Team, User } from '../models/index.js';
import { unassignNonParticipants } from '../services/access.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Deactivated users are hidden everywhere in the app.
const POPULATE = { path: 'members', select: 'name email role', match: { isActive: true } };

async function findTeam(id) {
  const team = await Team.findById(id);
  if (!team) throw ApiError.notFound('Team not found');
  return team;
}

/** Everyone can browse teams and their members. Only admins change them (see routes). */
export const listTeams = asyncHandler(async (_req, res) => {
  const teams = await Team.find().populate(POPULATE).sort({ name: 1 }).lean();
  const counts = await Project.aggregate([{ $unwind: '$teams' }, { $group: { _id: '$teams', count: { $sum: 1 } } }]);
  const byTeam = new Map(counts.map((c) => [String(c._id), c.count]));
  res.json({ items: teams.map((t) => ({ ...t, projectCount: byTeam.get(String(t._id)) ?? 0 })) });
});

export const getTeam = asyncHandler(async (req, res) => {
  const team = await findTeam(req.params.id);
  await team.populate(POPULATE);
  const projects = await Project.find({ teams: team._id }, 'name key description').sort({ name: 1 });
  res.json({ team, projects });
});

export const createTeam = asyncHandler(async (req, res) => {
  const { members, ...rest } = req.body;
  const validMembers = await User.find({ _id: { $in: members }, isActive: true }).distinct('_id');
  const team = await Team.create({ ...rest, members: validMembers });
  await team.populate(POPULATE);
  req.log.info({ teamId: String(team._id) }, 'Team created');
  res.status(201).json({ team });
});

export const updateTeam = asyncHandler(async (req, res) => {
  const team = await findTeam(req.params.id);
  Object.assign(team, req.body);
  await team.save();
  await team.populate(POPULATE);
  res.json({ team });
});

export const deleteTeam = asyncHandler(async (req, res) => {
  const team = await findTeam(req.params.id);
  const projectCount = await Project.countDocuments({ teams: team._id });
  if (projectCount) {
    throw ApiError.conflict(`This team works on ${projectCount} project(s). Remove it from those projects first.`);
  }
  await team.deleteOne();
  req.log.info({ teamId: String(team._id) }, 'Team deleted');
  res.status(204).end();
});

export const addMember = asyncHandler(async (req, res) => {
  const team = await findTeam(req.params.id);
  const user = await User.findOne({ _id: req.body.userId, isActive: true });
  if (!user) throw ApiError.field('userId', 'User not found or deactivated');
  if (team.hasUser(user._id)) throw ApiError.conflict(`${user.name} is already in this team`);
  team.members.addToSet(user._id);
  await team.save();
  await team.populate(POPULATE);
  res.json({ team });
});

export const removeMember = asyncHandler(async (req, res) => {
  const team = await findTeam(req.params.id);
  team.members.pull(req.params.userId);
  await team.save();
  const projectIds = await Project.find({ teams: team._id }).distinct('_id');
  const unassignedTasks = await unassignNonParticipants(projectIds);
  await team.populate(POPULATE);
  req.log.info({ teamId: String(team._id), removed: req.params.userId, unassignedTasks }, 'Member removed from team');
  res.json({ team, unassignedTasks });
});
