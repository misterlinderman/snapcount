import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST !== undefined;

/**
 * JSON logs in production (log drain friendly); pretty in local dev; silent in Vitest.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isTest ? 'silent' : isProd ? 'info' : 'debug'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
    ],
    remove: true,
  },
  ...(isProd || isTest
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, singleLine: true },
        },
      }),
});
