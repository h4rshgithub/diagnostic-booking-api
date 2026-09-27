import app from './app';
import { config } from './config';
import { logger } from './config/logger';
import prisma from './config/prisma';

async function start() {
  await prisma.$connect();
  logger.info('Database connected');

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'Server started');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
