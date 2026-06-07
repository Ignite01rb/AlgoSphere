import jwt from 'jsonwebtoken';
import { config } from '../config';

interface Claims {
  type: string;
  sub: string;
  iss: string;
}

export function createAccessToken(subject: string): string {
  const payload: Claims = {
    type: 'access',
    sub: subject,
    iss: 'algosphere',
  };

  return jwt.sign(payload, config.secretKey, {
    expiresIn: `${config.accessTokenExpireMinutes}m`,
  });
}

export function parseAccessToken(token: string): Claims | null {
  try {
    const decoded = jwt.verify(token, config.secretKey, {
      issuer: 'algosphere',
    }) as any;

    if (decoded && decoded.type === 'access' && decoded.sub) {
      return decoded as Claims;
    }
    return null;
  } catch (error) {
    return null;
  }
}
