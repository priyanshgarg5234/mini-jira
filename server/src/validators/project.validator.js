import { z } from 'zod';
import { objectId, requiredText } from './common.js';

const idList = z.array(objectId).max(200).optional().default([]).transform((ids) => [...new Set(ids)]);

export const createProjectSchema = z
  .object({
    name: requiredText('Project name', 2, 100),
    key: z
      .string({ required_error: 'Key is required' })
      .trim()
      .toUpperCase()
      .regex(/^[A-Z][A-Z0-9]{1,9}$/, 'Key must be 2-10 letters or numbers, starting with a letter'),
    description: z.string().trim().max(2000).optional().default(''),
    teams: idList,
    members: idList,
  })
  .refine((v) => v.teams.length + v.members.length > 0, {
    path: ['teams'],
    message: 'Add at least one team or member',
  });

export const updateProjectSchema = z
  .object({
    name: requiredText('Project name', 2, 100).optional(),
    description: z.string().trim().max(2000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const teamBody = z.object({ teamId: objectId });
export const memberBody = z.object({ userId: objectId });
export const teamParams = z.object({ id: objectId, teamId: objectId });
export const memberParams = z.object({ id: objectId, userId: objectId });
