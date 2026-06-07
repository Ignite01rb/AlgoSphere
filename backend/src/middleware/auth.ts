import { Request, Response, NextFunction } from 'express';
import { parseAccessToken } from '../utils/jwt';
import { prisma } from '../utils/db';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ detail: 'Authentication credentials were not provided.' });
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1].trim()) {
    return res.status(401).json({ detail: 'Authentication credentials were not provided.' });
  }

  const token = parts[1].trim();
  const claims = parseAccessToken(token);
  if (!claims) {
    return res.status(401).json({ detail: 'Invalid or expired authentication token.' });
  }

  try {
    const userId = BigInt(claims.sub);
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(401).json({ detail: 'Invalid authentication token.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ detail: 'Invalid authentication token.' });
  }
}
