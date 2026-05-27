import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {authRoutes} from './routes/auth.routes';
import {audioRoutes} from './routes/audio.routes';
import {errorHandler} from './middleware/errorHandler';
import {notFoundHandler} from './middleware/notFoundHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Health check
app.get('/health', (req, res) => {
  res.json({status: 'ok', timestamp: new Date().toISOString()});
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/audio', audioRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

