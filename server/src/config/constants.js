export const ROLES = Object.freeze({ ADMIN: 'admin', USER: 'user' });
export const ROLE_VALUES = Object.values(ROLES);

export const TASK_STATUS = ['todo', 'in_progress', 'in_review', 'done', 'closed'];
/** Statuses that count as "no more work needed". */
export const FINISHED_STATUSES = ['done', 'closed'];
export const TASK_PRIORITY = ['low', 'medium', 'high'];

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 15;
export const REFRESH_COOKIE = 'mj_refresh';
