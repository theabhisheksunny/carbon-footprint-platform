import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import usersRouter from './routes/users.js';
import activitiesRouter from './routes/activities.js';
import actionsRouter from './routes/actions.js';
import socialRouter from './routes/social.js';
import calculatorRouter from './routes/calculator.js';
import insightsRouter from './routes/insights.js';
import reportsRouter from './routes/reports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Serve static files from public directory
app.use(express.static(join(__dirname, '../public')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/social', socialRouter);
app.use('/api/calculator', calculatorRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/reports', reportsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  Carbon Footprint Awareness Platform                     ║
║  Server running on http://localhost:${PORT}               ║
║                                                          ║
║  API Documentation:                                      ║
║  - Users:       /api/users                               ║
║  - Activities:  /api/activities                          ║
║  - Actions:     /api/actions                             ║
║  - Social:      /api/social                              ║
║  - Calculator:  /api/calculator                          ║
║  - Insights:    /api/insights      (NEW!)                ║
║  - Reports:     /api/reports       (NEW!)                ║
║                                                          ║
║  Web UI:        http://localhost:${PORT}/                 ║
║  Health Check:  /health                                  ║
╚══════════════════════════════════════════════════════════╝
  `);
});

export default app;
