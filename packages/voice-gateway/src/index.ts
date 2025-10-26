import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { pino } from 'pino';
import { createRealtimeBridge } from './realtime-bridge';
import { config } from './config';
import { redactPII } from './utils/redact';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    log: (obj: any) => redactPII(obj),
  },
});

const app = Fastify({
  logger,
  trustProxy: true,
  bodyLimit: 10 * 1024 * 1024, // 10MB
});

let callCounter = 0;
let activeConnections = 0;

// Register plugins
await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(websocket, {
  options: {
    maxPayload: 10 * 1024 * 1024,
    perMessageDeflate: false,
  },
});

// Health check endpoint
app.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    service: 'voice-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    calls: {
      total: callCounter,
      active: activeConnections,
    },
    version: process.env.npm_package_version || '1.0.0',
  };
});

// Readiness check
app.get('/ready', async (request, reply) => {
  const ready = 
    !!process.env.OPENAI_API_KEY &&
    !!process.env.ELEVENLABS_API_KEY &&
    !!process.env.TWILIO_ACCOUNT_SID;

  if (!ready) {
    reply.code(503);
    return { ready: false, message: 'Missing required environment variables' };
  }

  return { ready: true };
});

// Twilio Media Streams WebSocket endpoint
app.register(async function (fastify) {
  fastify.get('/ws/twilio', { websocket: true }, (connection, request) => {
    const callId = `call_${Date.now()}_${++callCounter}`;
    activeConnections++;
    
    logger.info({ callId, remoteAddress: request.ip }, 'New WebSocket connection');
    
    // Use the OpenAI Realtime bridge instead of the old handler
    createRealtimeBridge(connection.socket, request);
    
    connection.socket.on('close', () => {
      activeConnections--;
      logger.info({ callId }, 'WebSocket connection closed');
    });

    connection.socket.on('error', (error) => {
      logger.error({ callId, error }, 'WebSocket error');
    });
  });
});

// Error handler
app.setErrorHandler((error, request, reply) => {
  logger.error({ error, url: request.url, method: request.method }, 'Request error');
  
  reply.code(error.statusCode || 500).send({
    error: {
      message: error.message || 'Internal server error',
      code: error.statusCode || 500,
    },
  });
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received');
  
  try {
    await app.close();
    logger.info('Server closed gracefully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    logger.info({ port, host }, 'Voice gateway server started');
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

start();
