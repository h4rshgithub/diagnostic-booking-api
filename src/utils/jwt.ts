import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Role } from '@prisma/client';

export function signToken(userId: string, role: Role): string {
  return jwt.sign({ userId, role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}
