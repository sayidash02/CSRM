import 'dotenv/config';
import app from './app';
import { assertProductionConfig, getConfig } from './config';
import { logger } from './lib/logger';

const config = getConfig();

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', { reason: String(reason) });
});

process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', { error: error.message, stack: error.stack });
});

assertProductionConfig();

app.listen(config.port, () => {
  logger.info('api_started', { port: config.port, environment: config.nodeEnv });
});
