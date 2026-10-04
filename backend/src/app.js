import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TraceRoot Backend API',
    runtime: 'Node.js (JavaScript ES Modules)',
    database: 'Supabase PostgreSQL 16',
    timestamp: new Date().toISOString(),
  });
});

// API Root
const API_PREFIX = process.env.API_PREFIX || '/api/v1';
app.get(API_PREFIX, (req, res) => {
  res.json({
    message: 'Welcome to TraceRoot API - Agricultural Contact and Transparency Platform',
    version: '1.0.0',
    documentation: '/api/v1/docs',
  });
});

export default app;
