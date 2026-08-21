import 'dotenv/config';
import app from './app';
import { assertProductionConfig, getConfig } from './config';
import { logger } from './lib/logger';

const config = getConfig();

assertProductionConfig();

app.listen(config.port, () => {
  logger.info('api_started', { port: config.port, environment: config.nodeEnv });
});
