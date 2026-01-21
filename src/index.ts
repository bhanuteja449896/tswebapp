import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { connectDatabase } from './config/database';
import { logger, loggerStream } from './utils/logger';
import { errorHandler, notFound } from './middleware/auth';
import { generalLimiter } from './middleware/rateLimiter';
import { sanitizeInput } from './middleware/validation';

// Import routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import projectRoutes from './routes/projectRoutes';
import taskRoutes from './routes/taskRoutes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDatabase();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream: loggerStream }));

// Request sanitization
app.use(sanitizeInput);

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

export default app;
