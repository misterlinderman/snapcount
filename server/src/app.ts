import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './logger';
import { buildCorsOrigin } from './config/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health';
import contentRoutes from './routes/content';
import userRoutes from './routes/users';
import deckRoutes from './routes/decks';
import sessionRoutes from './routes/sessions';
import itemRoutes from './routes/items';
import adminRoutes from './routes/admin';

/** HTTP app (no listen). Used by `index.ts` and integration tests. */
export function createApp(): express.Application {
  const app = express();

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(
    cors({
      origin: buildCorsOrigin(),
      credentials: true,
    })
  );

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) =>
          req.originalUrl === '/api/health' || req.originalUrl.startsWith('/api/health?'),
      },
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/health', healthRoutes);
  app.use('/api/content', contentRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/decks', deckRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/items', itemRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
