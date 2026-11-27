import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRouter from './routes/index.js';
import { ApiError } from './utils/ApiError.js';
import { sanitizeMiddleware } from './utils/sanitize.js';
import { parseCorsOrigins } from './utils/validateEnv.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import { notFoundMiddleware } from './middleware/notFoundMiddleware.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';

/**
 * Creates a configured Express application without binding a port or connecting to MongoDB.
 */
export const createApp = (options = {}) => {
  const app = express();
  const allowedOrigins =
    options.corsOrigins ??
    parseCorsOrigins(process.env.CLIENT_URL || process.env.CORS_ORIGINS || 'http://localhost:5173');

  app.use(helmet());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new ApiError(403, 'FORBIDDEN', 'Origin not allowed by CORS'));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(sanitizeMiddleware);

  app.use('/api', apiLimiter);
  app.use('/api', apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};

export default createApp();
