import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  environment: process.env.ALGOSPHERE_ENVIRONMENT || 'development',
  secretKey: process.env.ALGOSPHERE_SECRET_KEY || 'replace-this-with-a-long-random-secret',
  accessTokenExpireMinutes: parseInt(process.env.ALGOSPHERE_ACCESS_TOKEN_EXPIRE_MINUTES || '1440', 10),
  enableDocs: process.env.ALGOSPHERE_ENABLE_DOCS === 'true',
  corsOrigins: (process.env.ALGOSPHERE_CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(origin => origin.trim().replace(/\/$/, '')),
  allowedHosts: (process.env.ALGOSPHERE_ALLOWED_HOSTS || 'localhost,127.0.0.1')
    .split(',')
    .map(host => host.trim()),
  seedDemoData: process.env.ALGOSPHERE_SEED_DEMO_DATA === 'true',
  googleClientId: process.env.ALGOSPHERE_GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.ALGOSPHERE_GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.ALGOSPHERE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/google/callback',
  port: parseInt(process.env.PORT || '8000', 10),
};
