import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { authRouter } from './routes/auth';
import { groupsRouter } from './routes/groups';
import { friendsRouter } from './routes/friends';
import { challengesRouter } from './routes/challenges';
import { seedDatabase } from './utils/seed';
import { initSearchIndex } from './utils/search';

// Global BigInt JSON serialization patch
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());

// CORS setup matching Go chi router
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const isAllowed =
        config.corsOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('vercel.app') ||
        config.environment !== 'production'; // Allow local hosts in dev
      callback(null, isAllowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  })
);

// Request validation headers middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    );
  }
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (config.environment === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Register Routers
app.use(authRouter);
app.use(groupsRouter);
app.use(friendsRouter);
app.use(challengesRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err);
  const status = err.status || 500;
  const message = err.message || 'The request could not be completed. Please try again.';
  res.status(status).json({ detail: message });
});

// Bootloader function
async function startServer() {
  try {
    // Seed Database if enabled
    if (config.seedDemoData) {
      console.log('Seeding demo database...');
      await seedDatabase();
      console.log('Demo database seeded.');
    }

    // Populate search autocompletes
    console.log('Initializing search index...');
    await initSearchIndex();
    console.log('Search index populated.');

    app.listen(config.port, () => {
      console.log(`Server listening on port ${config.port} in ${config.environment} mode.`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

void startServer();
