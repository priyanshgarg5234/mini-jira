import { z } from 'zod';
import { ROLE_VALUES } from '../config/constants.js';
import { email, password, requiredText } from './common.js';

export const createUserSchema = z.object({
  name: requiredText('Name', 2, 80),
  email,
  role: z.enum(ROLE_VALUES, { errorMap: () => ({ message: 'Choose a role' }) }),
  password,
});

export const updateUserSchema = z
  .object({
    name: requiredText('Name', 2, 80).optional(),
    email: email.optional(),
    role: z.enum(ROLE_VALUES).optional(),
    isActive: z.literal(false, { errorMap: () => ({ message: 'Users can only be deactivated' }) }).optional(),
    password: password.optional(), // admin password reset
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const listUsersQuery = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(ROLE_VALUES).optional(),
});
