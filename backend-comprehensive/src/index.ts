/**
 * Main entry point for Music Repair App Backend
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import {errorHandler} from './middleware/errorHandler';
import {logger} from './utils/logger';
import {cacheService} from './services/cache.service';
import {authRoutes} from './api/auth.routes';
import {audioRoutes} from './api/audio.routes';
import {userRoutes} from './api/user.routes';
import {identifyRoutes} from './api/identify.routes';
import {aiRoutes} from './api/ai.routes';
import {chartsRoutes} from './api/charts.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true, limit: '50mb'}));

// Health check
app.get('/health', (req, res) => {
  res.json({status: 'ok', timestamp: new Date().toISOString()});
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/user', userRoutes);
app.use('/api/identify', identifyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/charts', chartsRoutes);

// Error handling
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  try {
    // Connect to Redis cache
    await cacheService.connect();
    logger.info('Services initialized');
  } catch (error) {
    logger.error('Error initializing services:', error);
    // Continue without cache if Redis is unavailable
  }
}

// Start server
async function startServer() {
  await initializeServices();
  
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await cacheService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await cacheService.disconnect();
  process.exit(0);
});

startServer();

export default app;

