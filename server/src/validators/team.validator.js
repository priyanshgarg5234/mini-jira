import { z } from 'zod';
import { objectId, requiredText } from './common.js';

export const createTeamSchema = z.object({
  name: requiredText('Team name', 2, 80),
  description: z.string().trim().max(1000).optional().default(''),
  members: z.array(objectId).max(200).optional().default([]),
});

export const updateTeamSchema = z
  .object({
    name: requiredText('Team name', 2, 80).optional(),
    description: z.string().trim().max(1000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const memberBody = z.object({ userId: objectId });
export const memberParams = z.object({ id: objectId, userId: objectId });
