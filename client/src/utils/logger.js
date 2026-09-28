/* Tiny client logger: verbose in development, errors only in production builds. */
const dev = import.meta.env.DEV;

export const logger = {
  debug: (...args) => dev && console.debug('[mini-jira]', ...args),
  warn: (...args) => console.warn('[mini-jira]', ...args),
  error: (...args) => console.error('[mini-jira]', ...args),
};
