import { Request, Response, NextFunction } from 'express';
import { signupSchema, loginSchema } from '../schemas/auth.schema';
import * as authService from '../services/auth.service';
import { success } from '../utils/response';

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const input = signupSchema.parse(req.body);
    const user = await authService.signup(input);
    success(res, user, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    success(res, result);
  } catch (err) {
    next(err);
  }
}
