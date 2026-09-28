import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

for (const key of ['MONGO_URI', 'ACCESS_TOKEN_SECRET']) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}
if (isProd && process.env.ACCESS_TOKEN_SECRET.length < 32) {
  throw new Error('ACCESS_TOKEN_SECRET must be at least 32 characters in production');
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  isTest,
  // Vercel sets VERCEL=1. Serverless functions can freeze after responding,
  // so background work (emails) must finish before the response is sent.
  isServerless: Boolean(process.env.VERCEL),
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 7,
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,
  timezone: process.env.APP_TIMEZONE || 'UTC',
  logLevel: process.env.LOG_LEVEL || (isTest ? 'silent' : isProd ? 'info' : 'debug'),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'Mini Jira <no-reply@minijira.dev>',
  },
});
