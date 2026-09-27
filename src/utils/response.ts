import { Response } from 'express';

export function success<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data });
}
