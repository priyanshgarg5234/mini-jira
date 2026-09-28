import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiLimiter } from './middleware/security.js';
import routes from './routes/index.js';

export function createApp() {
  const app = express();

  if (env.isProd) app.set('trust proxy', 1); // correct client IPs behind a load balancer
  app.disable('x-powered-by');

  app.use(requestLogger);
  app.use(helmet());
  app.use(
    cors({
      origin: env.clientUrl, // only our frontend may call the API with credentials
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api', apiLimiter, routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
