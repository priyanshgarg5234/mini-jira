import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.logLevel,
  // Never write credentials or tokens to logs.
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]', '*.password', '*.token'],
    censor: '[redacted]',
  },
  transport:
    env.isProd || env.isTest
      ? undefined
      : { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } },
});
